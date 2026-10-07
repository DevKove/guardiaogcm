import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-me";
import {
  DESFECHOS, NATUREZAS, PRIORIDADES, STATUS, TIPOS_ENVOLVIDO, fmtData, fmtProtocolo, minutosEntre, selectCls, type Status,
} from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/ocorrencias/$id")({
  head: () => ({ meta: [{ title: "Ocorrência · CAD" }] }),
  component: Detalhe,
});

function Detalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [nota, setNota] = useState("");
  const [viaturaSel, setViaturaSel] = useState("");
  const [encerrar, setEncerrar] = useState<null | "encerrada" | "cancelada">(null);
  const [desfecho, setDesfecho] = useState<string>(DESFECHOS[0]);
  const [obsFinal, setObsFinal] = useState("");
  const [editando, setEditando] = useState(false);

  const { data: o, isLoading } = useQuery({
    queryKey: ["ocorrencia", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ocorrencias").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: livres = [] } = useQuery({
    queryKey: ["viaturas", "livres"],
    queryFn: async () => {
      const { data } = await supabase.from("viaturas").select("id, prefixo, tipo, guarnicao").eq("status", "disponivel").eq("ativa", true).order("prefixo");
      return data ?? [];
    },
  });

  const { data: envolvidos = [] } = useQuery({
    queryKey: ["envolvidos", id],
    queryFn: async () => {
      const { data } = await supabase.from("ocorrencia_envolvidos").select("*").eq("ocorrencia_id", id).order("created_at");
      return data ?? [];
    },
  });

  const { data: hist = [] } = useQuery({
    queryKey: ["historico", id],
    queryFn: async () => {
      const { data } = await supabase.from("ocorrencia_historico").select("*").eq("ocorrencia_id", id).order("created_at", { ascending: false });
      const ids = [...new Set((data ?? []).map((h) => h.usuario_id).filter((id): id is string => Boolean(id)))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,nome").in("id", ids) : { data: [] };
      const map = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      return (data ?? []).map((h) => ({ ...h, autor: map.get(h.usuario_id) || "—" }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("oc-" + id)
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencias", filter: `id=eq.${id}` }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function refresh() {
    ["ocorrencia", "historico", "envolvidos"].forEach((k) => qc.invalidateQueries({ queryKey: [k, id] }));
    qc.invalidateQueries({ queryKey: ["ocorrencias"] });
    qc.invalidateQueries({ queryKey: ["viaturas"] });
  }

  async function log(descricao: string) {
    const { error } = await supabase.from("ocorrencia_historico").insert({ ocorrencia_id: id, usuario_id: me!.id, descricao });
    if (error) toast.error("Não foi possível registrar a nota: " + error.message);
    return !error;
  }

  async function update(patch: Record<string, unknown>, descricao: string) {
    const { data, error } = await supabase.from("ocorrencias").update(patch as never).eq("id", id).select("id");
    if (error || !data?.length) {
      toast.error(error?.message ?? "Sem permissão para alterar esta ocorrência");
      return false;
    }
    const { error: logError } = await supabase.from("ocorrencia_historico").insert({
      ocorrencia_id: id, usuario_id: me!.id, descricao,
    });
    if (logError) toast.error("Alteração salva, mas não foi possível registrar a nota manual.");
    refresh();
    return true;
  }

  async function despachar() {
    const v = livres.find((x) => x.id === viaturaSel);
    if (!v || !o) return;
    const { error } = await (supabase as never as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> })
      .rpc("despachar_viatura", { _ocorrencia_id: id, _viatura_id: v.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    setViaturaSel("");
    toast.success(`${v.prefixo} despachada`);
    refresh();
  }

  async function chegada() {
    const { error } = await (supabase as never as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> })
      .rpc("marcar_chegada", { _ocorrencia_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Chegada registrada");
    refresh();
  }

  async function finalizar() {
    if (!encerrar || !o) return;
    const { error } = await (supabase as never as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> })
      .rpc("finalizar_ocorrencia", {
        _ocorrencia_id: id,
        _status: encerrar,
        _desfecho: encerrar === "encerrada" ? desfecho : "Cancelada",
        _observacao: obsFinal.trim(),
      });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEncerrar(null);
    setObsFinal("");
    toast.success("Ocorrência finalizada");
    refresh();
  }

  async function reabrir() {
    await update({ status: "aberta", encerrada_em: null, desfecho: null }, "Ocorrência reaberta");
  }

  async function addNota() {
    if (!nota.trim()) return;
    if (await log(nota.trim())) {
      setNota("");
      refresh();
    }
  }

  if (isLoading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!o) return <div>Ocorrência não encontrada.</div>;

  const st = o.status as Status;
  const podeEditar = !!me && (me.isSupervisor || o.criado_por === me.id);
  const ativa = st === "aberta" || st === "em_atendimento";
  const tResp = minutosEntre(o.created_at, o.chegada_em);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/painel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Link to="/imprimir/$id" params={{ id }} target="_blank" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Printer className="h-4 w-4" /> Imprimir boletim
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs tracking-widest text-muted-foreground">PROTOCOLO</div>
          <h1 className="font-mono text-3xl font-bold text-primary">{fmtProtocolo(o.protocolo, o.created_at)}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORIDADES[o.prioridade]?.cls}`}>{PRIORIDADES[o.prioridade]?.label}</span>
            <span className={`rounded border px-2 py-0.5 text-xs ${STATUS[st].cls}`}>{STATUS[st].label}</span>
            {o.desfecho && <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">{o.desfecho}</span>}
          </div>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            {ativa && <Button variant="outline" onClick={() => setEditando(true)}>Editar dados</Button>}
            {ativa && o.viatura_id && !o.chegada_em && <Button variant="secondary" onClick={chegada}>Chegada no local</Button>}
            {ativa && <Button onClick={() => setEncerrar("encerrada")}>Encerrar</Button>}
            {ativa && <Button variant="destructive" onClick={() => setEncerrar("cancelada")}>Cancelar</Button>}
            {!ativa && me?.isSupervisor && <Button variant="outline" onClick={reabrir}>Reabrir</Button>}
          </div>
        )}
      </div>

      {/* Linha do tempo operacional */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { l: "Abertura", v: fmtData(o.created_at) },
          { l: "Despacho", v: fmtData(o.despachada_em) },
          { l: "Chegada", v: fmtData(o.chegada_em) },
          { l: "Finalização", v: fmtData(o.encerrada_em) },
          { l: "Tempo-resposta", v: tResp !== null ? `${tResp} min` : "—" },
        ].map((x) => (
          <div key={x.l} className="card-3d animate-rise p-3">
            <div className="text-xs text-muted-foreground">{x.l}</div>
            <div className="font-mono text-sm">{x.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {podeEditar && ativa && (
            <div className="space-y-2 rounded-md border border-primary bg-card p-5">
              <h2 className="font-semibold text-primary">Despacho</h2>
              <div className="text-sm text-muted-foreground">
                Viatura atual: <span className="font-mono text-foreground">{o.viatura || "nenhuma"}</span>
              </div>
              <div className="flex gap-2">
                <select className={selectCls} value={viaturaSel} onChange={(e) => setViaturaSel(e.target.value)}>
                  <option value="" className="bg-popover">{livres.length ? "Selecione uma viatura disponível" : "Nenhuma viatura disponível"}</option>
                  {livres.map((v) => (
                    <option key={v.id} value={v.id} className="bg-popover">
                      {v.prefixo} · {v.tipo}{v.guarnicao ? ` · ${v.guarnicao}` : ""}
                    </option>
                  ))}
                </select>
                <Button onClick={despachar} disabled={!viaturaSel}>{o.viatura_id ? "Trocar" : "Despachar"}</Button>
              </div>
            </div>
          )}

          <div className="grid gap-4 card-3d animate-rise p-5 md:grid-cols-2">
            <Field l="Natureza" v={o.natureza} />
            <Field l="Origem" v={o.origem} />
            <Field l="Endereço" v={`${o.endereco}${o.numero ? ", " + o.numero : ""}`} />
            <Field l="Bairro" v={o.bairro} />
            <Field l="Referência" v={o.referencia} />
            <Field l="Viatura" v={o.viatura} />
            <Field l="Solicitante" v={o.solicitante_nome} />
            <Field l="Telefone" v={o.solicitante_telefone} />
          </div>
          <div className="card-3d animate-rise p-5">
            <div className="text-xs uppercase text-muted-foreground">Relato</div>
            <p className="mt-2 whitespace-pre-wrap">{o.relato}</p>
          </div>

          <Envolvidos ocorrenciaId={id} lista={envolvidos} pode={podeEditar} meId={me?.id} isSup={!!me?.isSupervisor} onChange={refresh} log={log} />
        </div>

        <div className="space-y-3 card-3d animate-rise p-5">
          <h2 className="font-semibold text-primary">Histórico</h2>
          {podeEditar && (
            <div className="space-y-2">
              <Textarea rows={2} placeholder="Adicionar informação..." value={nota} onChange={(e) => setNota(e.target.value)} />
              <Button size="sm" onClick={addNota} className="w-full">Adicionar</Button>
            </div>
          )}
          <ol className="space-y-3 border-l pl-4">
            {hist.map((h) => (
              <li key={h.id} className="text-sm">
                <div className="font-mono text-xs text-muted-foreground">{fmtData(h.created_at)} · {h.autor}</div>
                <div className="whitespace-pre-wrap">{h.descricao}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Dialog open={!!encerrar} onOpenChange={(v) => !v && setEncerrar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{encerrar === "encerrada" ? "Encerrar ocorrência" : "Cancelar ocorrência"}</DialogTitle></DialogHeader>
          {encerrar === "encerrada" && (
            <div className="space-y-1">
              <Label>Desfecho</Label>
              <select className={selectCls} value={desfecho} onChange={(e) => setDesfecho(e.target.value)}>
                {DESFECHOS.map((d) => <option key={d} className="bg-popover">{d}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label>{encerrar === "cancelada" ? "Motivo do cancelamento" : "Observações finais"}</Label>
            <Textarea rows={3} value={obsFinal} onChange={(e) => setObsFinal(e.target.value)} />
          </div>
          <Button onClick={finalizar} variant={encerrar === "cancelada" ? "destructive" : "default"} disabled={encerrar === "cancelada" && !obsFinal.trim()}>
            Confirmar
          </Button>
        </DialogContent>
      </Dialog>

      <EditarDialog open={editando} onClose={() => setEditando(false)} o={o} onSave={update} />
    </div>
  );
}

type Oc = NonNullable<Awaited<ReturnType<typeof fetchOcType>>>;
async function fetchOcType() {
  return (await supabase.from("ocorrencias").select("*").single()).data;
}

function EditarDialog({ open, onClose, o, onSave }: { open: boolean; onClose: () => void; o: Oc; onSave: (p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  const [f, setF] = useState(o);
  useEffect(() => setF(o), [o, open]);
  const set = (k: keyof Oc, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  async function salvar() {
    const campos = ["natureza", "prioridade", "endereco", "numero", "bairro", "referencia", "solicitante_nome", "solicitante_telefone", "relato"] as const;
    const patch: Record<string, unknown> = {};
    const mud: string[] = [];
    campos.forEach((c) => {
      if (f[c] !== o[c]) {
        patch[c] = f[c];
        mud.push(c);
      }
    });
    if (!mud.length) return onClose();
    if (await onSave(patch, `Dados alterados: ${mud.join(", ")}`)) {
      toast.success("Dados atualizados");
      onClose();
    }
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar ocorrência</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Natureza</Label>
            <select className={selectCls} value={f.natureza} onChange={(e) => set("natureza", e.target.value)}>
              {[...new Set([f.natureza, ...NATUREZAS])].map((n) => <option key={n} className="bg-popover">{n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Prioridade</Label>
            <select className={selectCls} value={f.prioridade} onChange={(e) => set("prioridade", Number(e.target.value))}>
              {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k} className="bg-popover">{v.label}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Logradouro</Label><Input value={f.endereco} onChange={(e) => set("endereco", e.target.value)} /></div>
          <div className="space-y-1"><Label>Número</Label><Input value={f.numero ?? ""} onChange={(e) => set("numero", e.target.value)} /></div>
          <div className="space-y-1"><Label>Bairro</Label><Input value={f.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} /></div>
          <div className="space-y-1"><Label>Referência</Label><Input value={f.referencia ?? ""} onChange={(e) => set("referencia", e.target.value)} /></div>
          <div className="space-y-1"><Label>Solicitante</Label><Input value={f.solicitante_nome ?? ""} onChange={(e) => set("solicitante_nome", e.target.value)} /></div>
          <div className="space-y-1"><Label>Telefone</Label><Input value={f.solicitante_telefone ?? ""} onChange={(e) => set("solicitante_telefone", e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label>Relato</Label><Textarea rows={5} value={f.relato} onChange={(e) => set("relato", e.target.value)} /></div>
        <Button onClick={salvar}>Salvar alterações</Button>
      </DialogContent>
    </Dialog>
  );
}

type Env = { id: string; tipo: string; nome: string; documento: string | null; telefone: string | null; observacao: string | null; criado_por: string };

function Envolvidos({ ocorrenciaId, lista, pode, meId, isSup, onChange, log }: {
  ocorrenciaId: string; lista: Env[]; pode: boolean; meId?: string | undefined; isSup: boolean; onChange: () => void; log: (d: string) => Promise<boolean>;
}) {
  const vazio = { tipo: TIPOS_ENVOLVIDO[0] as string, nome: "", documento: "", telefone: "", observacao: "" };
  const [f, setF] = useState(vazio);
  const [aberto, setAberto] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("ocorrencia_envolvidos").insert({ ...f, ocorrencia_id: ocorrenciaId, criado_por: meId! });
    if (error) return void toast.error(error.message);
    await log(`Envolvido adicionado: ${f.tipo} — ${f.nome}`);
    setF(vazio);
    setAberto(false);
    onChange();
  }
  async function remover(env: Env) {
    if (!confirm(`Remover ${env.nome}?`)) return;
    const { error } = await supabase.from("ocorrencia_envolvidos").delete().eq("id", env.id);
    if (error) return void toast.error(error.message);
    await log(`Envolvido removido: ${env.tipo} — ${env.nome}`);
    onChange();
  }

  return (
    <div className="space-y-3 card-3d animate-rise p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-primary">Envolvidos ({lista.length})</h2>
        {pode && <Button size="sm" variant="secondary" onClick={() => setAberto(!aberto)}>{aberto ? "Fechar" : "Adicionar"}</Button>}
      </div>
      {aberto && (
        <form onSubmit={add} className="grid gap-2 rounded border p-3 md:grid-cols-2">
          <select className={selectCls} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {TIPOS_ENVOLVIDO.map((t) => <option key={t} className="bg-popover">{t}</option>)}
          </select>
          <Input required placeholder="Nome *" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          <Input placeholder="Documento (RG/CPF)" value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} />
          <Input placeholder="Telefone" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
          <Input className="md:col-span-2" placeholder="Observação" value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} />
          <Button type="submit" className="md:col-span-2">Salvar envolvido</Button>
        </form>
      )}
      {lista.length === 0 && !aberto && <div className="text-sm text-muted-foreground">Nenhum envolvido registrado.</div>}
      <ul className="divide-y">
        {lista.map((env) => (
          <li key={env.id} className="flex items-start justify-between gap-2 py-2 text-sm">
            <div>
              <span className="mr-2 rounded border px-1.5 py-0.5 text-xs text-primary">{env.tipo}</span>
              <span className="font-medium">{env.nome}</span>
              <div className="text-xs text-muted-foreground">
                {[env.documento, env.telefone, env.observacao].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            {(isSup || env.criado_por === meId) && (
              <button onClick={() => remover(env)} className="text-muted-foreground hover:text-destructive" title="Remover">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ l, v }: { l: string; v: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{l}</div>
      <div>{v || "—"}</div>
    </div>
  );
}

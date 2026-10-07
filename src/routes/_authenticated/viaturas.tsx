import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Car, Pencil, Plus, Power, Trash2, Gauge, Users, Siren, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { TIPOS_VIATURA, VSTATUS, selectCls, type VStatus } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/viaturas")({
  head: () => ({ meta: [{ title: "Viaturas · CAD" }, { name: "description", content: "Frota da Guarda Municipal em tempo real." }] }),
  component: Viaturas,
});

type Form = { id?: string; prefixo: string; placa: string; modelo: string; tipo: string; guarnicao: string; equipe_ids: string[]; km_atual: string; observacao: string };
const vazio: Form = { prefixo: "", placa: "", modelo: "", tipo: "Viatura", guarnicao: "", equipe_ids: [], km_atual: "", observacao: "" };

function Viaturas() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [edit, setEdit] = useState<Form | null>(null);
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["viaturas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("viaturas")
        .select("*, ocorrencias!viaturas_ocorrencia_id_fkey(id, protocolo, natureza, created_at), viatura_integrantes(equipe:equipe_id(id, nome, matricula, tipo))")
        .order("prefixo");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("viaturas-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "viaturas" }, () => qc.invalidateQueries({ queryKey: ["viaturas"] }))
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [qc]);

  async function patch(id: string, p: Record<string, unknown>) {
    const { error } = await supabase.from("viaturas").update(p as never).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["viaturas"] });
  }
  async function remover(id: string) {
    if (!confirm("Remover esta viatura?")) return;
    const { error } = await supabase.from("viaturas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["viaturas"] });
  }

  const lista = data.filter((v) => `${v.prefixo} ${v.placa ?? ""} ${v.guarnicao ?? ""} ${v.modelo ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const resumo = (Object.keys(VSTATUS) as VStatus[]).map((k) => ({ k, n: data.filter((v) => v.ativa && v.status === k).length }));

  return (
    <div className="space-y-6">
      <PageHeader icon={Car} asset="viatura.gif" kicker="FROTA" title="Viaturas">
        {me?.isSupervisor && <Button onClick={() => setEdit({ ...vazio })}><img src={`${import.meta.env.BASE_URL}cad-assets/adicionar.gif`} alt="" aria-hidden="true" className="h-5 w-5 object-contain" /> Nova viatura</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {resumo.map((r, i) => (
          <div key={r.k} className="card-3d lift animate-rise p-3" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`live-dot h-2 w-2 rounded-full ${VSTATUS[r.k].dot}`} />
              {VSTATUS[r.k].label}
            </div>
            <div className="font-mono text-2xl font-bold">{r.n}</div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar prefixo, placa, guarnição..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((v, i) => {
          const st = v.status as VStatus;
          const oc = v.ocorrencias as { id: string; protocolo: number; natureza: string } | null;
          return (
            <div key={v.id} className={`card-3d lift animate-rise relative overflow-hidden p-4 ${!v.ativa ? "opacity-50" : ""}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className={`absolute inset-x-0 top-0 h-1 ${VSTATUS[st].dot}`} />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="icon-chip h-11 w-11"><Car className="h-5 w-5" /></div>
                  <div>
                    <div className="font-mono text-xl font-bold text-primary">{v.prefixo}</div>
                    <div className="text-xs text-muted-foreground">{v.tipo} · {v.modelo || "—"} · {v.placa || "—"}</div>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${VSTATUS[st].cls}`}>
                  <span className={`live-dot h-1.5 w-1.5 rounded-full ${VSTATUS[st].dot}`} />{VSTATUS[st].label}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{(Array.isArray(v.viatura_integrantes) ? v.viatura_integrantes.map((x: { equipe?: { nome?: string } | null }) => x.equipe?.nome).filter(Boolean).join(", ") : "") || v.guarnicao || "Sem guarnição"}</div>
                <div className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" />{v.km_atual != null ? `${v.km_atual.toLocaleString("pt-BR")} km` : "— km"}</div>
              </div>
              {v.observacao && <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs">{v.observacao}</p>}
              {me?.isSupervisor && (
                <div className="mt-3 space-y-1">
                  <Label className="text-xs">Status</Label>
                  <select
                    className={selectCls}
                    value={st}
                    onChange={(e) => {
                      const ns = e.target.value as VStatus;
                      patch(v.id, ns === "disponivel" || ns === "manutencao" || ns === "fora_servico" ? { status: ns, ocorrencia_id: null } : { status: ns });
                    }}
                  >
                    {(Object.keys(VSTATUS) as VStatus[]).map((k) => <option key={k} value={k} className="bg-popover">{VSTATUS[k].label}</option>)}
                  </select>
                </div>
              )}
              {oc && (
                <Link to="/ocorrencias/$id" params={{ id: oc.id }} className="mt-3 flex items-center gap-2 rounded-md border border-info p-2 text-xs text-info transition hover:bg-accent">
                  <Siren className="h-3.5 w-3.5" /> Empenhada: #{oc.protocolo} · {oc.natureza}
                </Link>
              )}
              <div className="mt-3 flex gap-1 border-t pt-3">
                {me && (
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ id: v.id, prefixo: v.prefixo, placa: v.placa ?? "", modelo: v.modelo ?? "", tipo: v.tipo, guarnicao: v.guarnicao ?? "", equipe_ids: [], km_atual: v.km_atual?.toString() ?? "", observacao: v.observacao ?? "" })}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
                {me?.isAdmin && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => patch(v.id, { ativa: !v.ativa })}><Power className="h-3.5 w-3.5" /> {v.ativa ? "Desativar" : "Reativar"}</Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-destructive" aria-label={`Remover viatura ${v.prefixo}`} onClick={() => remover(v.id)}><img src={`${import.meta.env.BASE_URL}cad-assets/excluir.gif`} alt="" aria-hidden="true" className="h-6 w-6 object-contain" /></Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <div className="card-3d col-span-full p-10 text-center text-muted-foreground">Nenhuma viatura encontrada.</div>}
      </div>

      <ViaturaDialog f={edit} onClose={() => setEdit(null)} podeTudo={!!me?.isSupervisor} podeEditarGuarnicao={!!me} />
    </div>
  );
}

function ViaturaDialog({ f: init, onClose, podeTudo, podeEditarGuarnicao }: { f: Form | null; onClose: () => void; podeTudo: boolean; podeEditarGuarnicao: boolean }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(vazio);
  const [equipeIds, setEquipeIds] = useState<string[]>([]);
  const [integranteSelecionado, setIntegranteSelecionado] = useState("");
  const { data: plantao } = useQuery({
    queryKey: ["plantao-atual-viatura-dialog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plantoes").select("id").eq("status", "aberto").maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
    enabled: !!init,
  });
  const { data: efetivo = [] } = useQuery({
    queryKey: ["equipe-viatura-dialog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipe").select("id, nome, matricula, tipo, funcao").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; matricula: string | null; tipo: string; funcao: string }[];
    },
    enabled: !!init,
  });
  useEffect(() => {
    if (init) {
      setF(init);
      setEquipeIds(init.equipe_ids);
    }
  }, [init]);
  useEffect(() => {
    if (!init?.id || !plantao?.id) return;
    void supabase.from("viatura_integrantes").select("equipe_id").eq("viatura_id", init.id).eq("plantao_id", plantao.id).then(({ data }) => {
      setEquipeIds((data ?? []).map((x) => x.equipe_id));
    });
  }, [init?.id, plantao?.id]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!init?.id) {
      if (!podeTudo) return void toast.error("Somente supervisores podem cadastrar uma nova viatura.");
      const { data: viaturaSalva, error } = await supabase.from("viaturas").insert({
        prefixo: f.prefixo,
        placa: f.placa || null,
        modelo: f.modelo || null,
        tipo: f.tipo,
        guarnicao: null,
        km_atual: f.km_atual ? Number(f.km_atual) : null,
        observacao: f.observacao || null,
      } as never).select("id").single();
      if (error) return void toast.error(error.message);
      toast.success("Viatura cadastrada");
      onClose();
      qc.invalidateQueries({ queryKey: ["viaturas"] });
      return void viaturaSalva;
    }

    if (!plantao?.id) {
      return void toast.error("É necessário ter um plantão aberto para alterar os integrantes da guarnição.");
    }

    const idsAtivos = new Set(efetivo.map((m) => m.id));
    const permitidos = equipeIds.filter((id) => idsAtivos.has(id));
    if (permitidos.length !== equipeIds.length) {
      return void toast.error("Selecione somente integrantes ativos cadastrados na Equipe.");
    }

    if (!podeTudo) {
      // Operador comum: RLS permite alterar somente os vínculos da viatura no plantão aberto.
      const { error: delError } = await supabase
        .from("viatura_integrantes")
        .delete()
        .eq("viatura_id", init.id)
        .eq("plantao_id", plantao.id);
      if (delError) return void toast.error("Não foi possível atualizar a guarnição: " + delError.message);

      if (permitidos.length) {
        const { error: insError } = await supabase.from("viatura_integrantes").insert(
          permitidos.map((equipe_id) => ({
            plantao_id: plantao.id,
            viatura_id: init.id!,
            equipe_id,
            papel: "integrante",
          })),
        );
        if (insError) return void toast.error("Não foi possível gravar os integrantes: " + insError.message);
      }

      toast.success("Integrantes da guarnição atualizados.");
      onClose();
      qc.invalidateQueries({ queryKey: ["viaturas"] });
      return;
    }

    const membros = efetivo.filter((m) => permitidos.includes(m.id));
    const payload = {
      prefixo: f.prefixo,
      placa: f.placa || null,
      modelo: f.modelo || null,
      tipo: f.tipo,
      guarnicao: membros.map((m) => m.nome).join(", ") || null,
      km_atual: f.km_atual ? Number(f.km_atual) : null,
      observacao: f.observacao || null,
    };

    const { data: viaturaSalva, error } = await supabase
      .from("viaturas")
      .update(payload as never)
      .eq("id", init.id)
      .select("id")
      .single();
    if (error) return void toast.error(error.message);

    const { error: delError } = await supabase
      .from("viatura_integrantes")
      .delete()
      .eq("viatura_id", viaturaSalva.id)
      .eq("plantao_id", plantao.id);
    if (delError) return void toast.error("Não foi possível atualizar a guarnição: " + delError.message);

    if (permitidos.length) {
      const { error: insError } = await supabase.from("viatura_integrantes").insert(
        permitidos.map((equipe_id) => ({
          plantao_id: plantao.id,
          viatura_id: viaturaSalva.id!,
          equipe_id,
          papel: "integrante",
        })),
      );
      if (insError) return void toast.error("Não foi possível gravar os integrantes: " + insError.message);
    }

    toast.success("Viatura atualizada");
    onClose();
    qc.invalidateQueries({ queryKey: ["viaturas"] });
  }
  const set = (k: Exclude<keyof Form, "equipe_ids">) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={!!init} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? `Editar viatura ${f.prefixo}` : "Cadastrar viatura"}</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Prefixo *</Label><Input required disabled={!podeTudo} value={f.prefixo} onChange={set("prefixo")} /></div>
          <div className="space-y-1"><Label>Placa</Label><Input disabled={!podeTudo} value={f.placa} onChange={set("placa")} /></div>
          <div className="space-y-1"><Label>Modelo</Label><Input disabled={!podeTudo} value={f.modelo} onChange={set("modelo")} /></div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <select className={selectCls} disabled={!podeTudo} value={f.tipo} onChange={set("tipo")}>
              {TIPOS_VIATURA.map((t) => <option key={t} className="bg-popover">{t}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Integrantes da guarnição</Label>
            <div className="rounded-md border bg-background p-2">
              {equipeIds.length === 0 ? (
                <Button type="button" variant="ghost" className="w-full justify-start gap-2" disabled={!podeEditarGuarnicao || !plantao?.id} onClick={() => setIntegranteSelecionado("__abrir__")}>
                  <Plus className="h-4 w-4" /> Adicionar integrante
                </Button>
              ) : (
                <div className="space-y-1.5">
                  {equipeIds.map((id, index) => {
                    const m = efetivo.find((x) => x.id === id);
                    if (!m) return null;
                    return (
                      <div key={id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <span className="block font-medium">{index + 1}. {m.nome}</span>
                          <span className="block text-xs text-muted-foreground">{m.tipo}{m.matricula ? ` · Matrícula ${m.matricula}` : ""}{m.funcao ? ` · ${m.funcao}` : ""}</span>
                        </div>
                        <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={!podeEditarGuarnicao || !plantao?.id} onClick={() => setEquipeIds((ids) => ids.filter((item) => item !== id))}>Remover</Button>
                      </div>
                    );
                  })}
                  <Button type="button" variant="ghost" className="w-full justify-start gap-2" disabled={!podeEditarGuarnicao || !plantao?.id} onClick={() => setIntegranteSelecionado("__abrir__")}>
                    <Plus className="h-4 w-4" /> Adicionar integrante
                  </Button>
                </div>
              )}
            </div>
            {integranteSelecionado === "__abrir__" && (
              <div className="flex gap-2">
                <select autoFocus className={selectCls + " flex-1"} value="" disabled={!podeEditarGuarnicao || !plantao?.id} onChange={(e) => {
                  if (!e.target.value) return;
                  setEquipeIds((ids) => ids.includes(e.target.value) ? ids : [...ids, e.target.value]);
                  setIntegranteSelecionado("");
                }}>
                  <option value="" className="bg-popover">Selecione um integrante...</option>
                  {efetivo.map((m) => (
                    <option key={m.id} value={m.id} disabled={equipeIds.includes(m.id)} className="bg-popover">
                      {m.nome}{m.matricula ? ` · Matrícula ${m.matricula}` : ""}{m.funcao ? ` · ${m.funcao}` : ""}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={() => setIntegranteSelecionado("")}>Cancelar</Button>
              </div>
            )}
            {!plantao?.id && <p className="text-xs text-warning">Inicie um plantão para vincular integrantes à viatura.</p>}
            <p className="text-xs text-muted-foreground">Use + para adicionar cada integrante individualmente.</p>
          </div>
          <div className="space-y-1"><Label>Quilometragem atual</Label><Input type="number" min={0} value={f.km_atual} onChange={set("km_atual")} /></div>
          <div className="col-span-2 space-y-1"><Label>Observações</Label><Textarea rows={2} value={f.observacao} onChange={set("observacao")} /></div>
          <Button type="submit" className="col-span-2">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

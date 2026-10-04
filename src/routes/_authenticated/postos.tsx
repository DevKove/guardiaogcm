import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { School, HeartPulse, Hospital, Landmark, Trees, Bus, Cross, MapPin, Phone, User, Clock, Pencil, Plus, Trash2, Search, Building2, CalendarClock, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-me";
import { PageHeader, StatCard } from "@/components/page-header";
import { TIPOS_POSTO, FUNCOES_ESCALA, TURNOS, selectCls } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/postos")({
  head: () => ({ meta: [{ title: "Postos fixos · CAD" }, { name: "description", content: "Escolas, unidades de saúde e prédios públicos com cobertura da Guarda." }] }),
  component: Postos,
});

const ICONES: Record<string, LucideIcon> = {
  Escola: School, "Unidade de Saúde": HeartPulse, "UPA / Hospital": Hospital, "Prédio público": Landmark,
  "Praça / Parque": Trees, Terminal: Bus, Cemitério: Cross, Outro: Building2,
};

type Form = { id?: string; nome: string; tipo: string; endereco: string; bairro: string; telefone: string; responsavel: string; horario: string; observacao: string };
const vazio: Form = { nome: "", tipo: "Escola", endereco: "", bairro: "", telefone: "", responsavel: "", horario: "", observacao: "" };

function Postos() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [edit, setEdit] = useState<Form | null>(null);
  const [destinar, setDestinar] = useState<{ id: string; nome: string } | null>(null);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const hoje = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const { data = [] } = useQuery({
    queryKey: ["postos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("postos_fixos").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
  const { data: efetivo = [] } = useQuery({
    queryKey: ["equipe-postos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipe").select("id, nome, matricula, tipo, funcao").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; matricula: string | null; tipo: string; funcao: string }[];
    },
  });
  const { data: alocacoesHoje = [] } = useQuery({
    queryKey: ["postos-agentes-hoje", hoje],
    queryFn: async () => {
      const { data, error } = await supabase.from("escalas").select("id, posto_id, agentes, turno").eq("data", hoje);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase.channel("postos-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "postos_fixos" }, () => qc.invalidateQueries({ queryKey: ["postos"] }))
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [qc]);

  async function patch(id: string, p: Record<string, unknown>) {
    const { error } = await supabase.from("postos_fixos").update(p as never).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["postos"] });
  }
  async function remover(id: string) {
    if (!confirm("Remover este posto?")) return;
    const { error } = await supabase.from("postos_fixos").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["postos"] });
  }
  async function removerAgentePosto(escala: { id: string; agentes: string | null }) {
    if (!confirm(`Remover ${escala.agentes ?? "o agente"} deste posto fixo?`)) return;
    const escalaId = escala.id;
    const { error: integranteError } = await supabase
      .from("escala_integrantes")
      .delete()
      .eq("escala_id", escalaId);

    if (integranteError) return void toast.error("Não foi possível remover o agente: " + integranteError.message);

    const { error: escalaError } = await supabase.from("escalas").delete().eq("id", escalaId);
    if (escalaError) return void toast.error("Agente removido, mas não foi possível limpar o registro do plantão: " + escalaError.message);

    toast.success(`${escala.agentes ?? "Agente"} removido do posto fixo.`);
    qc.invalidateQueries({ queryKey: ["postos-agentes-hoje"] });
  }


  const lista = data.filter((p) => (!tipo || p.tipo === tipo) && `${p.nome} ${p.bairro ?? ""} ${p.endereco ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const cobertos = new Set(alocacoesHoje.map((e) => e.posto_id).filter(Boolean));

  return (
    <div className="space-y-6">
      <PageHeader icon={School} kicker="PATRIMÔNIO PROTEGIDO" title="Postos fixos">
        {me?.isSupervisor && <Button onClick={() => setEdit({ ...vazio })}><Plus className="h-4 w-4" /> Novo posto</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Building2} label="Postos ativos" value={data.filter((p) => p.ativo).length} />
        <StatCard icon={School} label="Escolas" value={data.filter((p) => p.tipo === "Escola").length} tone="text-info" delay={60} />
        <StatCard icon={HeartPulse} label="Saúde" value={data.filter((p) => p.tipo === "Unidade de Saúde" || p.tipo === "UPA / Hospital").length} tone="text-success" delay={120} />
        <StatCard icon={User} label="Com agentes hoje" value={`${cobertos.size}/${data.filter((p) => p.ativo).length}`} tone="text-warning" delay={180} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar nome, bairro, endereço..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${selectCls} w-auto`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="" className="bg-popover">Todos os tipos</option>
          {TIPOS_POSTO.map((t) => <option key={t} className="bg-popover">{t}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((p, i) => {
          const Icon = ICONES[p.tipo] ?? Building2;
          const esc = alocacoesHoje.filter((e) => e.posto_id === p.id);
          return (
            <div key={p.id} className={`card-3d lift animate-rise p-4 ${!p.ativo ? "opacity-50" : ""}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start gap-3">
                <div className="icon-chip h-11 w-11 shrink-0"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-tight">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">{p.tipo}</div>
                </div>
                {esc.length > 0
                  ? <span className="flex items-center gap-1.5 rounded-full border border-success px-2 py-0.5 text-xs text-success"><span className="live-dot h-1.5 w-1.5 rounded-full bg-success" />Coberto</span>
                  : <span className="rounded-full border border-muted-foreground px-2 py-0.5 text-xs text-muted-foreground">Sem agentes destinados</span>}
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{p.endereco || "—"}{p.bairro ? ` · ${p.bairro}` : ""}</div>
                <div className="flex gap-1.5"><Phone className="h-3.5 w-3.5" />{p.telefone || "—"}</div>
                <div className="flex gap-1.5"><User className="h-3.5 w-3.5" />{p.responsavel || "—"}</div>
                <div className="flex gap-1.5"><Clock className="h-3.5 w-3.5" />{p.horario || "—"}</div>
              </div>
              {esc.length > 0 && (
                <div className="mt-3 rounded-md border border-success/40 bg-success/10 p-2 text-xs">
                  {esc.map((e, j) => (
                    <div key={j} className="flex items-center justify-between gap-2">
                      <span><b>{e.turno}:</b> {e.agentes}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => removerAgentePosto(e)}
                        title="Remover agente do posto fixo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Remover agente do posto</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {p.observacao && <p className="mt-2 text-xs italic text-muted-foreground">{p.observacao}</p>}
              <div className="mt-3 border-t pt-3">
                <Button className="w-full justify-center gap-2" onClick={() => setDestinar({ id: p.id, nome: p.nome })} disabled={!p.ativo} aria-label={`Adicionar agente ao plantão de ${p.nome}`}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20"><Plus className="h-4 w-4" /></span>
                  Adicionar agente ao plantão
                </Button>
              </div>
              {me?.isSupervisor && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ id: p.id, nome: p.nome, tipo: p.tipo, endereco: p.endereco ?? "", bairro: p.bairro ?? "", telefone: p.telefone ?? "", responsavel: p.responsavel ?? "", horario: p.horario ?? "", observacao: p.observacao ?? "" })}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => patch(p.id, { ativo: !p.ativo })}>{p.ativo ? "Desativar" : "Reativar"}</Button>
                  {me.isAdmin && <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => remover(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              )}
            </div>
          );
        })}
        {lista.length === 0 && <div className="card-3d col-span-full p-10 text-center text-muted-foreground">Nenhum posto cadastrado.</div>}
      </div>

      <PostoDialog f={edit} onClose={() => setEdit(null)} />
      <DestinarDialog posto={destinar} efetivo={efetivo} onClose={() => setDestinar(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["postos-agentes"] }); qc.invalidateQueries({ queryKey: ["postos-agentes-hoje"] }); }} />
    </div>
  );
}

function PostoDialog({ f: init, onClose }: { f: Form | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(vazio);
  useEffect(() => { if (init) setF(init); }, [init]);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { id, ...rest } = f;
    const payload = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v]));
    const { error } = id
      ? await supabase.from("postos_fixos").update(payload as never).eq("id", id)
      : await supabase.from("postos_fixos").insert(payload as never);
    if (error) return void toast.error(error.message);
    toast.success(id ? "Posto atualizado" : "Posto cadastrado");
    onClose();
    qc.invalidateQueries({ queryKey: ["postos"] });
  }
  return (
    <Dialog open={!!init} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar posto" : "Novo posto fixo"}</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Nome *</Label><Input required placeholder="Ex: EMEF Monteiro Lobato" value={f.nome} onChange={set("nome")} /></div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <select className={selectCls} value={f.tipo} onChange={set("tipo")}>{TIPOS_POSTO.map((t) => <option key={t} className="bg-popover">{t}</option>)}</select>
          </div>
          <div className="space-y-1"><Label>Bairro</Label><Input value={f.bairro} onChange={set("bairro")} /></div>
          <div className="col-span-2 space-y-1"><Label>Endereço</Label><Input value={f.endereco} onChange={set("endereco")} /></div>
          <div className="space-y-1"><Label>Telefone</Label><Input value={f.telefone} onChange={set("telefone")} /></div>
          <div className="space-y-1"><Label>Responsável</Label><Input value={f.responsavel} onChange={set("responsavel")} /></div>
          <div className="col-span-2 space-y-1"><Label>Horário de funcionamento</Label><Input placeholder="Ex: Seg–Sex 07h–18h" value={f.horario} onChange={set("horario")} /></div>
          <div className="col-span-2 space-y-1"><Label>Observações</Label><Textarea rows={2} value={f.observacao} onChange={set("observacao")} /></div>
          <Button type="submit" className="col-span-2">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


type IntegranteEscala = { id: string; nome: string; matricula: string | null; tipo: string; funcao: string };

function DestinarDialog({ posto, efetivo, onClose, onSaved }: {
  posto: { id: string; nome: string } | null;
  efetivo: IntegranteEscala[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  const [turno, setTurno] = useState("Diurno");
  const [horaInicio, setHoraInicio] = useState("07:00");
  const [horaFim, setHoraFim] = useState("19:00");
  const [funcao, setFuncao] = useState("Posto fixo");
  const [equipeId, setEquipeId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [avisoOutroPosto, setAvisoOutroPosto] = useState<string | null>(null);

  useEffect(() => {
    if (!posto) return;
    setData(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    setTurno("Diurno");
    setHoraInicio("07:00");
    setHoraFim("19:00");
    setFuncao("Posto fixo");
    setEquipeId("");
    setObservacao("");
    setSalvando(false);
    setAvisoOutroPosto(null);
  }, [posto?.id]);

  useEffect(() => {
    let ativo = true;

    async function verificarOutroPosto() {
      setAvisoOutroPosto(null);
      if (!posto || !equipeId || !data) return;

      const { data: integrantes, error: integrantesError } = await supabase
        .from("escala_integrantes")
        .select("escala_id")
        .eq("equipe_id", equipeId);

      if (integrantesError || !integrantes?.length) return;

      const escalaIds = integrantes.map((item) => item.escala_id);
      const { data: escalas, error: escalasError } = await supabase
        .from("escalas")
        .select("posto_id")
        .eq("data", data)
        .in("id", escalaIds)
        .neq("posto_id", posto.id);

      if (escalasError || !escalas?.length) return;

      const postoIds = [...new Set(escalas.map((item) => item.posto_id).filter(Boolean))] as string[];
      if (!postoIds.length) return;

      const { data: postos, error: postosError } = await supabase
        .from("postos_fixos")
        .select("id, nome")
        .in("id", postoIds);

      if (postosError || !postos?.length || !ativo) return;

      const nomes = postos.map((p) => p.nome).filter(Boolean);
      if (nomes.length) {
        setAvisoOutroPosto(
          `⚠️ AVISO: Este agente já está destinado ao posto fixo ${nomes.join(", ")} neste dia.`,
        );
      }
    }

    void verificarOutroPosto();
    return () => {
      ativo = false;
    };
  }, [equipeId, data, posto?.id]);

  function mudarTurno(v: string) {
    setTurno(v);
    if (v === "Diurno") { setHoraInicio("07:00"); setHoraFim("19:00"); }
    else if (v === "Noturno") { setHoraInicio("19:00"); setHoraFim("07:00"); }
    else if (v === "Madrugada") { setHoraInicio("00:00"); setHoraFim("07:00"); }
    else { setHoraInicio("07:00"); setHoraFim("13:00"); }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!posto) return;
    if (!equipeId) return void toast.error("Selecione um agente para este plantão.");
    setSalvando(true);
    const membro = efetivo.find((m) => m.id === equipeId);
    if (!membro) { setSalvando(false); return void toast.error("Agente selecionado não encontrado. Atualize a lista e tente novamente."); }
    const { data: escala, error } = await supabase.from("escalas").insert({
      data, turno, hora_inicio: horaInicio, hora_fim: horaFim,
      agentes: membro.nome,
      funcao, posto_id: posto.id, viatura_id: null,
      observacao: observacao.trim() || null,
    } as never).select("id").single();
    if (error || !escala) {
      setSalvando(false);
      return void toast.error(error?.message ?? "Não foi possível registrar os agentes deste posto.");
    }
    const { error: integrantesError } = await supabase.from("escala_integrantes").insert(
      [{ escala_id: escala.id, equipe_id: equipeId }],
    );
    if (integrantesError) {
      await supabase.from("escalas").delete().eq("id", escala.id);
      setSalvando(false);
      return void toast.error("Não foi possível registrar os agentes: " + integrantesError.message);
    }
    toast.success(`${membro.nome} adicionado ao plantão de ${posto.nome}.`);
    setSalvando(false);
    onClose();
    onSaved();
  }

  return (
    <Dialog open={!!posto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agentes em serviço — {posto?.nome ?? "Posto fixo"}</DialogTitle>
          {avisoOutroPosto && (
            <div className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm font-semibold text-warning" role="alert">
              {avisoOutroPosto}
            </div>
          )}
        </DialogHeader>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Data de atuação</Label><Input type="date" required value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="space-y-1"><Label>Turno</Label><select className={selectCls} value={turno} onChange={(e) => mudarTurno(e.target.value)}>{TURNOS.map((t) => <option key={t} value={t} className="bg-popover">{t}</option>)}</select></div>
          <div className="space-y-1"><Label>Função</Label><select className={selectCls} value={funcao} onChange={(e) => setFuncao(e.target.value)}>{[...new Set(["Posto fixo", ...FUNCOES_ESCALA])].map((t) => <option key={t} value={t} className="bg-popover">{t}</option>)}</select></div>
          <div className="space-y-1"><Label>Início</Label><Input type="time" required value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} /></div>
          <div className="space-y-1"><Label>Fim</Label><Input type="time" required value={horaFim} onChange={(e) => setHoraFim(e.target.value)} /></div>
          <div className="col-span-2 space-y-2">
            <Label>Selecione o agente para este plantão *</Label>
            {efetivo.length === 0 ? <p className="rounded-md border p-3 text-sm text-destructive">Nenhum integrante ativo cadastrado. Cadastre os agentes no menu Equipe antes de fazer a destinação.</p> : (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                {efetivo.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/60">
                    <input type="radio" name="agente-plantao" className="h-4 w-4 accent-primary" checked={equipeId === m.id} onChange={() => setEquipeId(m.id)} />
                    <span className="min-w-0 flex-1 text-sm font-medium">{m.nome}<span className="block text-xs text-muted-foreground">{m.tipo}{m.matricula ? ` · Matrícula ${m.matricula}` : ""} · {m.funcao}</span></span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Selecione um agente por vez. Para adicionar outro integrante ao mesmo plantão, use novamente este botão. Apenas integrantes ativos aparecem aqui.</p>
          </div>
          <div className="col-span-2 space-y-1"><Label>Observações</Label><Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></div>
          <Button type="submit" className="col-span-2" disabled={salvando || !efetivo.length || !equipeId}>{salvando ? "Adicionando agente..." : "Adicionar agente ao plantão"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock3, FileText, LockKeyhole, PlayCircle, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { selectCls } from "@/lib/cad";
import { useMe } from "@/hooks/use-me";
import { carregarAtividades, fmtDia, turnoAtual, type Plantao } from "@/lib/plantao";
import { PlantaoResumoTempoReal } from "@/components/plantao-tempo-real";
import { FichaPlantao } from "@/components/ficha-plantao";

export const Route = createFileRoute("/_authenticated/plantao")({
  head: () => ({ meta: [{ title: "Plantão · CAD" }] }),
  component: PlantaoControle,
});

function PlantaoControle() {
  const { data: me } = useMe();
  const [historico] = useState(() => new URLSearchParams(window.location.search).get("historico") ?? "");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [mostrarInicio, setMostrarInicio] = useState(false);
  const atual = turnoAtual();

  const { data: efetivo = [] } = useQuery({
    queryKey: ["equipe-plantao-inicio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe")
        .select("id, nome, matricula, tipo, funcao")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; matricula: string | null; tipo: string; funcao: string }[];
    },
  });

  const { data: plantao, isLoading } = useQuery({
    queryKey: ["plantao-atual"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plantoes")
        .select("*")
        .eq("status", "aberto")
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Plantao | null;
    },
    refetchInterval: 15000,
  });

  const { data: plantaoHistorico, isLoading: isLoadingHistorico, isError: isErrorHistorico, error: errorHistorico } = useQuery({
    queryKey: ["plantao-historico-detalhe", historico],
    enabled: Boolean(historico),
    queryFn: async () => {
      if (!historico) return null;
      const { data, error } = await supabase.from("plantoes").select("*").eq("id", historico).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Plantão finalizado não encontrado ou sua conta não possui permissão para visualizá-lo.");
      const { data: perfil, error: perfilError } = await supabase.from("profiles").select("nome").eq("id", data.operador_id).maybeSingle();
      if (perfilError) throw perfilError;
      return { plantao: data as unknown as Plantao, operadorNome: perfil?.nome ?? "" };
    },
  });

  if (historico) {
    if (isLoadingHistorico || !me) return <div className="text-muted-foreground">Carregando plantão finalizado...</div>;
    if (isErrorHistorico || !plantaoHistorico) return (
      <div className="space-y-3 rounded-lg border border-destructive/40 p-5">
        <div className="font-semibold text-destructive">Não foi possível abrir o plantão finalizado.</div>
        <div className="text-sm text-muted-foreground">{errorHistorico instanceof Error ? errorHistorico.message : "Registro não encontrado."}</div>
        <Button variant="outline" onClick={() => navigate({ to: "/historico" })}>Voltar ao histórico</Button>
      </div>
    );
    const p = plantaoHistorico.plantao;
    const editavel = Boolean(me.isAdmin);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <button type="button" onClick={() => navigate({ to: "/historico" })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">← Histórico</button>
            <div className="mt-1 font-mono text-xs tracking-widest text-muted-foreground">ARQUIVO OPERACIONAL</div>
            <h1 className="text-2xl font-bold">Plantão finalizado · {fmtDia(p.data_inicio)}</h1>
            <div className="text-xs text-muted-foreground">Turno: {p.turno} · Operador: {plantaoHistorico.operadorNome || "não informado"}</div>
          </div>
        </div>
        {!me.isAdmin && <div className="rounded border border-warning/50 p-3 text-sm text-warning print:hidden"><LockKeyhole className="mr-2 inline h-4 w-4" />Plantão finalizado. Somente o administrador pode editar este registro.</div>}
        {me.isAdmin && <div className="rounded border border-primary/30 bg-primary/5 p-3 text-sm print:hidden">Modo administrador: este plantão foi carregado diretamente do histórico e pode ser revisado e salvo.</div>}
        <FichaPlantao plantao={p} editavel={editavel} operadorNome={plantaoHistorico.operadorNome} />
      </div>
    );
  }

  useEffect(() => {
    const ch = supabase.channel("plantao-controle-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "plantoes" }, () => { void qc.invalidateQueries({ queryKey: ["plantao-atual"] }); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  async function iniciar(form: { nome: string; supervisorId: string; integrantes: string[]; operadorRadioId: string }) {
    if (!me) return;
    setSaving(true);
    const selecionados = efetivo.filter((m) => form.integrantes.includes(m.id));
    const supervisor = selecionados.find((m) => m.id === form.supervisorId);
    const operadorRadio = selecionados.find((m) => m.id === form.operadorRadioId);
    const { data, error } = await supabase.rpc("iniciar_plantao", {
      p_nome_plantao: form.nome,
      p_supervisor_id: form.supervisorId,
      p_integrantes: form.integrantes,
      p_operador_radio_id: form.operadorRadioId || null,
      p_data_inicio: atual.data,
      p_turno: atual.turno,
      p_horario: atual.horario,
    });
    if (error) {
      setSaving(false);
      toast.error(error.code === "23505" ? "Já existe um plantão aberto. Finalize-o antes de iniciar outro." : "Não foi possível iniciar o plantão: " + error.message);
      qc.invalidateQueries({ queryKey: ["plantao-atual"] });
      return;
    }
    const plantaoId = data as string;
    await supabase.from("plantoes").update({
      equipe: selecionados.map((m) => m.nome).join(", "),
      supervisor: supervisor?.nome ?? "",
      operador_radio: operadorRadio?.nome ?? null,
    } as never).eq("id", plantaoId);
    setSaving(false);
    setMostrarInicio(false);
    toast.success("Plantão iniciado com o efetivo selecionado.");
    qc.invalidateQueries({ queryKey: ["plantao-atual"] });
    qc.invalidateQueries({ queryKey: ["ocorrencias"] });
    navigate({ to: "/plantao/$id", params: { id: plantaoId } });
  }

  async function finalizar() {
    if (!plantao || !me) return;
    setSaving(true);
    const encerradoEm = new Date().toISOString();
    let resumo: Awaited<ReturnType<typeof carregarAtividades>>;
    try {
      resumo = await carregarAtividades({ ...plantao, encerrado_em: encerradoEm });
    } catch (e) {
      setSaving(false);
      toast.error("Não foi possível consolidar o relatório completo. O plantão continua aberto: " + (e instanceof Error ? e.message : "erro desconhecido"));
      return;
    }
    const { error } = await supabase
      .from("plantoes")
      .update({ status: "encerrado", encerrado_em: encerradoEm, resumo: { operador: me.nome, ...resumo } } as never)
      .eq("id", plantao.id)
      .eq("status", "aberto")
      .eq("operador_id", me.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível finalizar: " + error.message);
      return;
    }
    toast.success("Plantão finalizado e bloqueado para novos lançamentos.");
    qc.invalidateQueries({ queryKey: ["plantao-atual"] });
    qc.invalidateQueries({ queryKey: ["ocorrencias"] });
  }

  if (isLoading || !me) return <div className="text-muted-foreground">Carregando controle de plantão...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="font-mono text-xs tracking-widest text-muted-foreground">CONTROLE OPERACIONAL</div>
        <h1 className="text-2xl font-bold">Plantão</h1>
        <p className="text-sm text-muted-foreground">Todo registro operacional fica vinculado a um plantão aberto e identifica o usuário responsável pelo lançamento.</p>
      </div>

      {plantao ? (
        <>
        <PlantaoResumoTempoReal plantao={plantao} />
        <section className="card-3d animate-rise space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="h-5 w-5" /> Plantão em andamento</div>
              <h2 className="mt-1 text-xl font-bold">{plantao.turno} · {fmtDia(plantao.data_inicio)}</h2>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span><Clock3 className="mr-1 inline h-3 w-3" />Início: {new Date(plantao.iniciado_em).toLocaleString("pt-BR")}</span>
                <span>Operador: {plantao.operador_id === me.id ? "Você" : "outro usuário"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/plantao/$id", params: { id: plantao.id } })}><FileText className="h-4 w-4" /> Abrir relatório</Button>
              {plantao.operador_id === me.id && (
                <Button variant="destructive" onClick={finalizar} disabled={saving}><Square className="h-4 w-4" /> {saving ? "Finalizando..." : "Finalizar plantão"}</Button>
              )}
            </div>
          </div>
          {plantao.operador_id !== me.id && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-warning"><LockKeyhole className="h-4 w-4" /> Este plantão foi iniciado por outro usuário. Você pode consultar o andamento, mas o encerramento pertence ao operador que o iniciou.</div>
          )}
        </section>
        </>
      ) : (
        <section className="card-3d animate-rise space-y-5 p-5">
          <div className="flex items-center gap-3">
            <div className="icon-chip flex h-11 w-11 items-center justify-center text-primary-foreground"><PlayCircle className="h-6 w-6" /></div>
            <div><h2 className="text-xl font-bold">Nenhum plantão aberto</h2><p className="text-sm text-muted-foreground">Inicie o plantão para liberar ocorrências e demais lançamentos operacionais.</p></div>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <div className="font-semibold">Próximo plantão sugerido</div>
            <div className="mt-1 text-muted-foreground">{atual.turno} · {fmtDia(atual.data)} · {atual.horario}</div>
          </div>
          <Button onClick={() => setMostrarInicio(true)} disabled={saving || efetivo.length === 0}><PlayCircle className="h-4 w-4" /> Iniciar plantão</Button>
          {efetivo.length === 0 && <p className="text-xs text-warning">Cadastre integrantes ativos em Equipe antes de iniciar o plantão.</p>}
          <PlantaoInicioDialog
            open={mostrarInicio}
            onClose={() => setMostrarInicio(false)}
            efetivo={efetivo}
            saving={saving}
            onConfirm={iniciar}
          />
        </section>
      )}
    </div>
  );
}


function PlantaoInicioDialog({
  open,
  onClose,
  efetivo,
  saving,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  efetivo: { id: string; nome: string; matricula: string | null; tipo: string; funcao: string }[];
  saving: boolean;
  onConfirm: (form: { nome: string; supervisorId: string; integrantes: string[]; operadorRadioId: string }) => Promise<void>;
}) {
  const [nome, setNome] = useState<"ALPHA" | "BRAVO" | "CHARLIE" | "DELTA">("ALPHA");
  const [integrantes, setIntegrantes] = useState<string[]>([]);
  const [supervisorId, setSupervisorId] = useState("");
  const [operadorRadioId, setOperadorRadioId] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome("ALPHA");
    setIntegrantes([]);
    setSupervisorId("");
    setOperadorRadioId("");
  }, [open]);

  function toggleIntegrante(id: string) {
    setIntegrantes((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(supervisorId)) setSupervisorId("");
      if (!next.includes(operadorRadioId)) setOperadorRadioId("");
      return next;
    });
  }

  const podeSalvar = integrantes.length > 0 && integrantes.includes(supervisorId) && (!operadorRadioId || integrantes.includes(operadorRadioId));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Iniciar plantão</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            O plantão só pode ser iniciado com integrantes ativos cadastrados em <b>Equipe</b>. Nenhum nome pode ser digitado manualmente.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome do plantão *</Label>
              <select className={selectCls} value={nome} onChange={(e) => setNome(e.target.value as typeof nome)}>
                {["ALPHA", "BRAVO", "CHARLIE", "DELTA"].map((x) => <option key={x} value={x} className="bg-popover">{x}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Supervisor *</Label>
              <select className={selectCls} value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} disabled={!integrantes.length}>
                <option value="" className="bg-popover">Selecionar supervisor</option>
                {efetivo.filter((m) => integrantes.includes(m.id)).map((m) => (
                  <option key={m.id} value={m.id} className="bg-popover">{m.nome} · {m.funcao}{m.matricula ? ` · ${m.matricula}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Operador(a) de rádio</Label>
              <select className={selectCls} value={operadorRadioId} onChange={(e) => setOperadorRadioId(e.target.value)} disabled={!integrantes.length}>
                <option value="" className="bg-popover">Não informado</option>
                {efetivo.filter((m) => integrantes.includes(m.id)).map((m) => (
                  <option key={m.id} value={m.id} className="bg-popover">{m.nome} · {m.funcao}{m.matricula ? ` · ${m.matricula}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Integrantes do plantão * ({integrantes.length} selecionado(s))</Label>
            <div className="max-h-64 overflow-y-auto rounded-lg border p-2">
              <div className="grid gap-2 md:grid-cols-2">
                {efetivo.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent">
                    <input type="checkbox" checked={integrantes.includes(m.id)} onChange={() => toggleIntegrante(m.id)} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.nome}</span>
                      <span className="text-xs text-muted-foreground">{m.tipo} · {m.funcao}{m.matricula ? ` · ${m.matricula}` : ""}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={!podeSalvar || saving} onClick={() => void onConfirm({ nome, supervisorId, integrantes, operadorRadioId })}>
              {saving ? "Iniciando..." : "Confirmar início"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

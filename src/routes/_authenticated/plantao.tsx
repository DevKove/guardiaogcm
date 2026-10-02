import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock3, FileText, LockKeyhole, PlayCircle, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { carregarAtividades, fmtDia, turnoAtual, type Plantao } from "@/lib/plantao";
import { PlantaoResumoTempoReal } from "@/components/plantao-tempo-real";

export const Route = createFileRoute("/_authenticated/plantao")({
  head: () => ({ meta: [{ title: "Plantão · CAD" }] }),
  component: PlantaoControle,
});

function PlantaoControle() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const atual = turnoAtual();

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

  useEffect(() => {
    const ch = supabase.channel("plantao-controle-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "plantoes" }, () => { void qc.invalidateQueries({ queryKey: ["plantao-atual"] }); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  async function iniciar() {
    if (!me) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("plantoes")
      .insert({
        operador_id: me.id,
        data_inicio: atual.data,
        turno: atual.turno,
        horario: atual.horario,
        status: "aberto",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "Já existe um plantão aberto. Finalize-o antes de iniciar outro." : "Não foi possível iniciar o plantão: " + error.message);
      qc.invalidateQueries({ queryKey: ["plantao-atual"] });
      return;
    }
    toast.success("Plantão iniciado. Os lançamentos agora ficarão vinculados a este plantão.");
    qc.invalidateQueries({ queryKey: ["plantao-atual"] });
    qc.invalidateQueries({ queryKey: ["ocorrencias"] });
    navigate({ to: "/plantao/$id", params: { id: data.id } });
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
        <PlantaoResumoTempoReal plantaoId={plantao.id} />
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
          <Button onClick={iniciar} disabled={saving}><PlayCircle className="h-4 w-4" /> {saving ? "Iniciando..." : "Iniciar plantão"}</Button>
        </section>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Car, Clock3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, fmtProtocolo, type Status } from "@/lib/cad";
import { carregarAtividades, type PlantaoAtividade } from "@/lib/plantao";

const hora = (value: string) => new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const situacaoViatura: Record<string, string> = {
  disponivel: "Disponível", em_deslocamento: "Em deslocamento", no_local: "No local",
  retornando: "Retornando", manutencao: "Manutenção", fora_servico: "Fora de serviço",
};

export function PlantaoResumoTempoReal({ plantaoId }: { plantaoId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<PlantaoAtividade>({
    queryKey: ["plantao-live-summary", plantaoId],
    queryFn: async () => {
      const { data: p, error: pError } = await supabase.from("plantoes").select("*").eq("id", plantaoId).single();
      if (pError) throw pError;
      return carregarAtividades(p);
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["plantao-live-summary", plantaoId] }); };
    const ch = supabase.channel(`plantao-resumo-${plantaoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantoes", filter: `id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencias", filter: `plantao_id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_registros", filter: `plantao_id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_historico", filter: `plantao_id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencia_historico" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "viaturas" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "escalas" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "postos_fixos" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [plantaoId, qc]);

  if (isLoading) return <section className="card-3d p-5 text-sm text-muted-foreground">Carregando o painel operacional em tempo real...</section>;
  if (error) return <section className="card-3d p-5 text-sm text-destructive">Não foi possível carregar o resumo do plantão. {error.message}</section>;
  if (!data) return null;

  const abertas = data.ocorrencias.filter((o) => o.status === "aberta").length;
  const atendimento = data.ocorrencias.filter((o) => o.status === "em_atendimento").length;
  const encerradas = data.ocorrencias.filter((o) => o.status === "encerrada").length;
  const viaturasAtivas = data.viaturas.filter((v) => v.ativa).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success"><span className="live-dot h-2 w-2 rounded-full bg-success" /> Atualização em tempo real</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Ocorrências", value: data.ocorrencias.length, icon: Activity },
          { label: "Abertas", value: abertas, icon: Clock3 },
          { label: "Em atendimento", value: atendimento, icon: Activity },
          { label: "Viaturas ativas", value: viaturasAtivas, icon: Car },
        ].map((k) => <div key={k.label} className="card-3d p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><k.icon className="h-4 w-4" />{k.label}</div><div className="mt-1 font-mono text-2xl font-bold">{k.value}</div></div>)}
      </div>

      <section className="card-3d overflow-hidden p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-primary"><Activity className="h-4 w-4" /> Ocorrências deste plantão</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 pr-3">Hora</th><th className="pr-3">Protocolo</th><th className="pr-3">Natureza</th><th className="pr-3">Local</th><th className="pr-3">Prioridade</th><th className="pr-3">Viatura</th><th>Status</th></tr></thead>
            <tbody>{data.ocorrencias.map((o) => <tr key={o.id} className="border-b last:border-0"><td className="py-2 pr-3 font-mono">{hora(o.created_at)}</td><td className="pr-3 font-mono">{fmtProtocolo(o.protocolo, o.created_at)}</td><td className="pr-3">{o.natureza}</td><td className="pr-3">{o.endereco}{o.numero ? `, ${o.numero}` : ""}{o.bairro ? ` · ${o.bairro}` : ""}</td><td className="pr-3">{o.prioridade}</td><td className="pr-3">{o.viatura || "—"}</td><td>{STATUS[o.status as Status]?.label ?? o.status}</td></tr>)}</tbody>
          </table>
        </div>
        {!data.ocorrencias.length && <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma ocorrência vinculada a este plantão até o momento.</p>}
        <div className="mt-2 text-xs text-muted-foreground">{encerradas} ocorrência(s) encerrada(s) · os registros são vinculados automaticamente pelo sistema ao plantão ativo.</div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card-3d p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-primary"><Car className="h-4 w-4" /> Situação da frota</h3>
          <div className="space-y-2">
            {data.viaturas.map((v) => <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-xs last:border-0"><div><span className="font-mono font-bold">{v.prefixo}</span><span className="ml-2 text-muted-foreground">{v.tipo}{v.modelo ? ` · ${v.modelo}` : ""}</span><div className="mt-1 text-muted-foreground">{v.guarnicao || "Guarnição não informada"}{v.km_atual != null ? ` · ${v.km_atual.toLocaleString("pt-BR")} km` : ""}</div></div><span className={v.ativa ? "rounded-full border border-success/40 px-2 py-1 text-success" : "rounded-full border px-2 py-1 text-muted-foreground"}>{v.ativa ? (situacaoViatura[v.status] ?? v.status) : "Inativa"}</span></div>)}
            {!data.viaturas.length && <p className="text-sm text-muted-foreground">Nenhuma viatura cadastrada.</p>}
          </div>
        </section>
        <section className="card-3d p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-primary"><Users className="h-4 w-4" /> Equipes e escalas do turno</h3>
          <div className="space-y-3">
            {data.escalas.map((e) => <div key={e.id} className="border-b pb-2 text-xs last:border-0"><div className="font-semibold">{e.funcao} · {e.hora_inicio.slice(0, 5)}–{e.hora_fim.slice(0, 5)}</div><div className="mt-1">{e.agentes}</div>{e.observacao && <div className="mt-1 text-muted-foreground">{e.observacao}</div>}</div>)}
            {!data.escalas.length && <p className="text-sm text-muted-foreground">Nenhuma escala cadastrada para a data e o turno deste plantão.</p>}
          </div>
          <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">Próprios municipais ativos ({data.postosAtivos.length}): {data.postosAtivos.map((p) => p.nome).join(" · ") || "Nenhum cadastrado"}</div>
        </section>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, CheckCircle2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIORIDADES, STATUS, fmtData, fmtProtocolo, type Status } from "@/lib/cad";
import { QuadroAvisos } from "@/components/quadro-avisos";
import { useMe } from "@/hooks/use-me";
import { fmtDia, turnoAtual } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel operacional · CAD" }] }),
  component: Painel,
});

function Painel() {
  // O painel usa o título institucional do shell; não renderizar cabeçalho "Ocorrências" aqui.
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const atual = turnoAtual();
  // Exibe o histórico completo por padrão; os cartões permitem filtrar somente as ativas.
  const [filtro, setFiltro] = useState<Status | "ativas" | "todas">("todas");
  const [busca, setBusca] = useState("");

  const { data: plantaoAtual, isLoading: carregandoPlantao } = useQuery({
    queryKey: ["plantao-atual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plantoes").select("id, operador_id, data_inicio, turno, status, iniciado_em, equipe, supervisor, operador_radio, nome_plantao, supervisor_id, operador_radio_id, horario, guarnicoes, postos, atividades, materiais, informativo, atividades_verso, observacoes, encerrado_em").eq("status", "aberto").maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });


  const { data = [], isLoading } = useQuery({
    queryKey: ["ocorrencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const counts = useMemo(() => {
    const c = { aberta: 0, em_atendimento: 0, encerrada: 0, cancelada: 0 };
    data.forEach((o) => c[o.status as Status]++);
    return c;
  }, [data]);

  const lista = data
    .filter((o) =>
      filtro === "todas" ? true : filtro === "ativas" ? o.status === "aberta" || o.status === "em_atendimento" : o.status === filtro,
    )
    .filter((o) => {
      if (!busca) return true;
      const s = busca.toLowerCase();
      return [o.natureza, o.endereco, o.bairro, String(o.protocolo), o.solicitante_nome]
        .join(" ")
        .toLowerCase()
        .includes(s);
    })
    .sort((a, b) => (filtro === "ativas" ? a.prioridade - b.prioridade : 0));

  const cards: { k: typeof filtro; label: string; v: number; cls: string }[] = [
    { k: "ativas", label: "Ativas", v: counts.aberta + counts.em_atendimento, cls: "text-primary" },
    { k: "aberta", label: "Abertas", v: counts.aberta, cls: "text-warning" },
    { k: "em_atendimento", label: "Em atendimento", v: counts.em_atendimento, cls: "text-info" },
    { k: "encerrada", label: "Encerradas", v: counts.encerrada, cls: "text-success" },
    { k: "todas", label: "Todas", v: data.length, cls: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <QuadroAvisos />
      <section className="card-3d animate-rise border-primary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}cad-assets/walkie-talkie.gif`} alt="" aria-hidden="true" className="h-12 w-12 shrink-0 object-contain" />
            <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {plantaoAtual ? <CheckCircle2 className="h-4 w-4 text-success" /> : <PlayCircle className="h-4 w-4 text-warning" />}
              {plantaoAtual ? "Plantão em andamento" : "Nenhum plantão aberto"}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {plantaoAtual ? `${plantaoAtual.turno} · iniciado em ${new Date(plantaoAtual.iniciado_em).toLocaleString("pt-BR")}` : `${atual.turno} · ${fmtDia(atual.data)} · ${atual.horario}`}
              {plantaoAtual && (
                <a href={`${import.meta.env.BASE_URL}plantao`} className="inline-flex items-center gap-1 font-semibold text-success hover:underline">
                  <Activity className="h-3.5 w-3.5" /> Atualização em tempo real
                </a>
              )}
            </div>
            </div>
          </div>
          <div>
            {plantaoAtual ? (
              <Link to="/plantao/$id" params={{ id: plantaoAtual.id }} className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold hover:bg-accent">Abrir plantão / relatório</Link>
            ) : (
              <a href={`${import.meta.env.BASE_URL}plantao`} className={`inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 ${carregandoPlantao || !me ? "pointer-events-none opacity-50" : ""}`} aria-disabled={carregandoPlantao || !me}><PlayCircle className="h-4 w-4" /> Iniciar plantão</Link>
            )}
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-end justify-end gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar protocolo, endereço, natureza..."
            className="w-72"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Link to="/ocorrencias/nova" className="inline-flex items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
            + Nova ocorrência
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <button
            key={c.k}
            onClick={() => setFiltro(c.k)}
            className={`card-3d animate-rise p-4 text-left transition ${filtro === c.k ? "border-primary" : "hover:border-muted-foreground"}`}
          >
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className={`font-mono text-3xl font-bold ${c.cls}`}>{c.v}</div>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto card-3d animate-rise">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Protocolo</th>
              <th className="px-3 py-2">Prioridade</th>
              <th className="px-3 py-2">Natureza</th>
              <th className="px-3 py-2">Local</th>
              <th className="px-3 py-2">Viatura</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Abertura</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && lista.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Nenhuma ocorrência.</td></tr>
            )}
            {lista.map((o) => (
              <tr key={o.id} onClick={() => navigate({ to: "/ocorrencias/$id", params: { id: o.id } })} className="cursor-pointer border-b last:border-0 hover:bg-accent/50">
                <td className="px-3 py-2 font-mono">
                  <Link to="/ocorrencias/$id" params={{ id: o.id }} className="text-primary hover:underline">
                    <span className="inline-flex items-center gap-2"><img src={`${import.meta.env.BASE_URL}cad-assets/alerta.png`} alt="" aria-hidden="true" className="h-4 w-4 object-contain opacity-80" />{fmtProtocolo(o.protocolo, o.created_at)}</span>
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORIDADES[o.prioridade]?.cls}`}>
                    {PRIORIDADES[o.prioridade]?.label}
                  </span>
                </td>
                <td className="px-3 py-2">{o.natureza}</td>
                <td className="px-3 py-2">
                  {o.endereco}
                  {o.bairro && <span className="text-muted-foreground"> · {o.bairro}</span>}
                </td>
                <td className="px-3 py-2 font-mono">{o.viatura || "—"}</td>
                <td className="px-3 py-2">
                  <span className={`rounded border px-2 py-0.5 text-xs ${STATUS[o.status as Status].cls}`}>
                    {STATUS[o.status as Status].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{fmtData(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

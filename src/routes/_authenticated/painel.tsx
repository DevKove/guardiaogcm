import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, FileText, PackageCheck, PlayCircle, Radio, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { PRIORIDADES, STATUS, fmtData, fmtProtocolo, type Status } from "@/lib/cad";
import { QuadroAvisos } from "@/components/quadro-avisos";
import { useMe } from "@/hooks/use-me";
import { carregarAtividades, fmtDia, turnoAtual } from "@/lib/plantao";

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

  const { data: feed } = useQuery({
    queryKey: ["plantao-home-feed", plantaoAtual?.id],
    enabled: !!plantaoAtual,
    queryFn: () => carregarAtividades(plantaoAtual as { id: string; operador_id: string; iniciado_em: string; encerrado_em: string | null; data_inicio: string; turno: string }),
    refetchInterval: plantaoAtual ? 15000 : false,
  });

  async function iniciarPlantao() {
    if (!me) return;
    const { data, error } = await supabase.from("plantoes").insert({
      operador_id: me.id, data_inicio: atual.data, turno: atual.turno, horario: atual.horario, status: "aberto",
    }).select("id").single();
    if (error) {
      toast.error(error.code === "23505" ? "Já existe um plantão aberto. Finalize-o antes de iniciar outro." : error.message);
      qc.invalidateQueries({ queryKey: ["plantao-atual"] });
      return;
    }
    toast.success("Plantão iniciado.");
    qc.invalidateQueries({ queryKey: ["plantao-atual"] });
    navigate({ to: "/plantao/$id", params: { id: data.id } });
  }

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

  useEffect(() => {
    if (!plantaoAtual?.id) return;
    const tabelas = ["ocorrencias", "ocorrencia_historico", "plantao_historico", "plantao_registros", "plantao_integrantes", "plantoes", "escalas", "viaturas", "itens", "plantao_itens", "plantao_item_movimentos"];
    const channel = supabase.channel("painel-operacional-tempo-real");
    for (const tabela of tabelas) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: tabela }, () => {
        qc.invalidateQueries({ queryKey: ["ocorrencias"] });
        qc.invalidateQueries({ queryKey: ["plantao-atual"] });
        qc.invalidateQueries({ queryKey: ["plantao-home-feed", plantaoAtual.id] });
      });
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, plantaoAtual?.id]);

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
            <div className="mt-1 text-xs text-muted-foreground">
              {plantaoAtual ? `${plantaoAtual.turno} · iniciado em ${new Date(plantaoAtual.iniciado_em).toLocaleString("pt-BR")}` : `${atual.turno} · ${fmtDia(atual.data)} · ${atual.horario}`}
            </div>
            </div>
          </div>
          <div>
            {plantaoAtual ? (
              <Link to="/plantao/$id" params={{ id: plantaoAtual.id }} className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold hover:bg-accent">Abrir plantão / relatório</Link>
            ) : (
              <button onClick={iniciarPlantao} disabled={carregandoPlantao || !me} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><PlayCircle className="h-4 w-4" /> Iniciar plantão</button>
            )}
          </div>
        </div>
      </section>
      {plantaoAtual && (
        <section className="card-3d animate-rise space-y-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary"><FileText className="h-4 w-4" /> Atualização em tempo real</div>
              <div className="text-xs text-muted-foreground">Resumo operacional completo do plantão. Alterações, lançamentos, ocorrências, escalas, viaturas e movimentações de itens são atualizados automaticamente.</div>
            </div>
            <Link to="/plantao/$id" params={{ id: plantaoAtual.id }} className="text-xs font-semibold text-primary hover:underline">Abrir relatório completo</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <div className="rounded-lg border p-3"><div className="text-[10px] uppercase text-muted-foreground">Ocorrências</div><div className="font-mono text-xl font-bold text-primary">{feed?.ocorrencias.length ?? 0}</div></div>
            <div className="rounded-lg border p-3"><div className="text-[10px] uppercase text-muted-foreground">Lançamentos</div><div className="font-mono text-xl font-bold text-primary">{feed?.registros.length ?? 0}</div></div>
            <div className="rounded-lg border p-3"><div className="text-[10px] uppercase text-muted-foreground">Ações</div><div className="font-mono text-xl font-bold text-primary">{feed?.acoes.length ?? 0}</div></div>
            <div className="rounded-lg border p-3"><div className="text-[10px] uppercase text-muted-foreground">Alterações</div><div className="font-mono text-xl font-bold text-primary">{feed?.alteracoes.length ?? 0}</div></div>
            <div className="rounded-lg border p-3"><div className="text-[10px] uppercase text-muted-foreground">Escalas</div><div className="font-mono text-xl font-bold text-primary">{feed?.escalas.length ?? 0}</div></div>
            <div className="rounded-lg border p-3"><div className="text-[10px] uppercase text-muted-foreground">Mov. itens</div><div className="font-mono text-xl font-bold text-primary">{feed?.movimentacoesItens.length ?? 0}</div></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><ClipboardList className="h-4 w-4" /> Dados do plantão</div>
              <div className="rounded-lg border p-3 text-sm">
                <div><b>Nome do plantão:</b> {plantaoAtual.nome_plantao || "Não informado"} · <b>Turno:</b> {plantaoAtual.turno} · <b>Horário:</b> {plantaoAtual.horario || "—"}</div><div><b>Equipe:</b> {plantaoAtual.equipe || "Não informada"}</div>
                <div><b>Supervisor:</b> {plantaoAtual.supervisor || "Não informado"} · <b>Rádio:</b> {plantaoAtual.operador_radio || "Não informado"}</div>
                <div className="mt-2"><b>Guarnições:</b><div className="mt-1 space-y-1 text-muted-foreground">{Array.isArray(plantaoAtual.guarnicoes) && plantaoAtual.guarnicoes.length ? plantaoAtual.guarnicoes.map((g: any, i: number) => <div key={i}>{g.viatura || "VTR"} · Encarregado: {g.encarregado || "—"} · Condutor: {g.condutor || "—"} · Aux. 01: {g.aux1 || "—"} · Aux. 02: {g.aux2 || "—"}</div>) : "—"}</div></div><div className="mt-2"><b>Postos e conferências:</b><div className="mt-1 space-y-1 text-muted-foreground">{Array.isArray(plantaoAtual.postos) && plantaoAtual.postos.length ? plantaoAtual.postos.map((p: any, i: number) => <div key={i}>{p.nome || "Posto"} · {p.ok ? "Sem alteração" : `Com alteração: ${p.obs || "não informada"}`}</div>) : "—"}</div></div><div className="mt-2"><b>Informativo:</b><div className="mt-1 whitespace-pre-wrap text-muted-foreground">{plantaoAtual.informativo || "—"}</div></div>
                <div className="mt-2"><b>Atividades:</b><div className="mt-1 whitespace-pre-wrap text-muted-foreground">{plantaoAtual.atividades || "—"}</div></div>
                <div className="mt-2"><b>Materiais:</b><div className="mt-1 whitespace-pre-wrap text-muted-foreground">{plantaoAtual.materiais || "—"}</div></div>
                <div className="mt-2"><b>Atividades — verso:</b><div className="mt-1 whitespace-pre-wrap text-muted-foreground">{plantaoAtual.atividades_verso || "—"}</div></div><div className="mt-2"><b>Observações:</b><div className="mt-1 whitespace-pre-wrap text-muted-foreground">{plantaoAtual.observacoes || "—"}</div></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><FileText className="h-4 w-4" /> Lançamentos e ações</div>
              <div className="max-h-72 space-y-1 overflow-auto rounded-lg border p-3 text-xs">
                {feed?.registros.map((r) => <div key={r.id} className="border-b py-1.5 last:border-0"><span className="font-mono">{new Date(r.hora).toLocaleString("pt-BR")}</span> · {r.texto} <span className="text-muted-foreground">— {feed.usuarios[r.criado_por] ?? r.criado_por.slice(0, 8)}</span></div>)}
                {feed?.acoes.map((a, i) => <div key={`acao-${i}`} className="border-b py-1.5 last:border-0"><span className="font-mono">{new Date(a.created_at).toLocaleString("pt-BR")}</span> · {a.descricao}{a.protocolo ? ` · Protocolo ${a.protocolo}` : ""} <span className="text-muted-foreground">— {feed.usuarios[a.usuario_id] ?? a.usuario_id.slice(0, 8)}</span></div>)}
                {!feed?.registros.length && !feed?.acoes.length && <span className="text-muted-foreground">Nenhum lançamento ainda.</span>}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Ocorrências do plantão</div>
              <div className="max-h-80 space-y-2 overflow-auto rounded-lg border p-3 text-xs">
                {feed?.ocorrencias.map((o) => <div key={o.id} className="rounded-md border p-2"><div className="font-semibold">Protocolo {fmtProtocolo(o.protocolo, o.created_at)} · {o.natureza}</div><div>{o.endereco}{o.bairro ? ` · ${o.bairro}` : ""}</div><div className="mt-1 text-muted-foreground">Status: {STATUS[o.status as Status]?.label ?? o.status} · Prioridade: {PRIORIDADES[o.prioridade]?.label ?? o.prioridade} · Viatura: {o.viatura || "—"}</div><div className="mt-1 whitespace-pre-wrap">{o.relato || "Sem relato."}</div><div className="mt-1 text-muted-foreground">Desfecho: {o.desfecho || "—"}</div></div>)}
                {!feed?.ocorrencias.length && <span className="text-muted-foreground">Nenhuma ocorrência vinculada ao plantão.</span>}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Users className="h-4 w-4" /> Escalas e viaturas</div>
              <div className="max-h-80 space-y-2 overflow-auto rounded-lg border p-3 text-xs">
                {feed?.escalas.map((e) => <div key={e.id} className="rounded-md border p-2"><b>{e.funcao}</b> · {e.agentes}<div className="text-muted-foreground">{e.hora_inicio} às {e.hora_fim}{e.observacao ? ` · ${e.observacao}` : ""}</div></div>)}
                {feed?.viaturas.map((v) => <div key={v.id} className="rounded-md border p-2"><b>{v.prefixo}</b> · {v.modelo || v.tipo} · {v.status}<div className="text-muted-foreground">Guarnição: {v.guarnicao || "—"} · KM: {v.km_atual ?? "—"}{v.observacao ? ` · ${v.observacao}` : ""}</div></div>)}
                {!feed?.escalas.length && !feed?.viaturas.length && <span className="text-muted-foreground">Nenhuma escala ou viatura registrada.</span>}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><ClipboardList className="h-4 w-4" /> ITENS DO PLANTÃO</div>
              <div className="max-h-96 space-y-2 overflow-auto rounded-lg border p-3 text-xs">
                {feed?.itensPlantao.map((item) => <div key={item.item_id} className="rounded-md border p-2"><b>{item.nome}</b>{item.item_identificacao ? " · #" + item.item_identificacao : ""} · {item.categoria.toUpperCase()}<div className="text-muted-foreground">Patrimônio: {item.patrimonio || "—"} · Situação: <b>{item.situacao}</b> · Status: {item.status}</div>{item.observacao && <div className="text-muted-foreground">{item.observacao}</div>}</div>)}
                {!feed?.itensPlantao.length && <span className="text-muted-foreground">Nenhum item cadastrado para o plantão.</span>}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><PackageCheck className="h-4 w-4" /> Armas e rádios — retirada e entrega</div>
              <div className="max-h-80 space-y-2 overflow-auto rounded-lg border p-3 text-xs">
                {feed?.movimentacoesItens.map((m) => <div key={m.id} className="rounded-md border p-2"><b>{m.item_nome}</b>{m.item_identificacao ? ` · #${m.item_identificacao}` : ""} · {m.categoria.toUpperCase()}<div className="text-muted-foreground">Retirada: {feed.usuarios[m.retirado_por] ?? m.retirado_por.slice(0, 8)} · {new Date(m.retirado_em).toLocaleString("pt-BR")}</div><div className="text-muted-foreground">{m.entregue_em ? `Entrega: ${feed.usuarios[m.entregue_por ?? ""] ?? "Responsável"} · ${new Date(m.entregue_em).toLocaleString("pt-BR")}` : "Entrega pendente"}</div></div>)}
                {!feed?.movimentacoesItens.length && <span className="text-muted-foreground">Nenhuma movimentação de arma ou rádio neste plantão.</span>}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Radio className="h-4 w-4" /> Alterações realizadas</div>
              <div className="max-h-80 space-y-2 overflow-auto rounded-lg border p-3 text-xs">
                {feed?.alteracoes.map((a) => <div key={`${a.campo}-${a.created_at}`} className="rounded-md border p-2"><b>{a.label}</b><div className="mt-1 whitespace-pre-wrap">Atual: {typeof a.valor === "object" ? JSON.stringify(a.valor, null, 2) : String(a.valor ?? "—")}</div><div className="text-muted-foreground">Anterior: {typeof a.antes === "object" ? JSON.stringify(a.antes) : String(a.antes ?? "—")} · {new Date(a.created_at).toLocaleString("pt-BR")} · {feed.usuarios[a.usuario_id] ?? a.usuario_id.slice(0, 8)}</div></div>)}
                {!feed?.alteracoes.length && <span className="text-muted-foreground">Nenhuma edição registrada no plantão.</span>}
              </div>
            </div>
          </div>
        </section>
      )}
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { carregarAtividades, fmtDia, type AlteracaoPlantao, type Plantao } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/relatorio-pdf/$id")({
  head: () => ({ meta: [{ title: "Relatório oficial de plantão · CAD" }] }),
  component: VerPlantao,
});

function VerPlantao() {
  const { id } = Route.useParams();
  const { data: me, isLoading: carregandoPerfil } = useMe();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plantao", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("plantoes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Este plantão não foi encontrado ou sua conta não tem permissão para visualizá-lo.");
      const { data: prof, error: profileError } = await supabase.from("profiles").select("nome").eq("id", data.operador_id).maybeSingle();
      if (profileError) throw profileError;
      const p = {
        ...data,
        guarnicoes: Array.isArray(data.guarnicoes) ? data.guarnicoes : [],
        postos: Array.isArray(data.postos) ? data.postos : [],
      } as unknown as Plantao;
      return { p, nome: prof?.nome ?? "" };
    },
  });

  if (carregandoPerfil || isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Preparando relatório oficial…</div>;
  if (!me) return <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">Sua sessão não foi identificada. Saia e entre novamente no CAD.</div>;
  if (isError || !data) {
    return <div className="mx-auto mt-10 max-w-2xl space-y-4 rounded-xl border border-red-200 bg-white p-6"><div className="flex items-center gap-2 font-semibold text-red-700"><AlertCircle className="h-5 w-5" /> Não foi possível abrir o relatório</div><p className="text-sm text-slate-600">{error instanceof Error ? error.message : "Ocorreu um erro ao consultar o plantão."}</p><div className="flex gap-2"><Button variant="outline" onClick={() => void refetch()}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button><Button asChild variant="outline"><Link to="/historico"><ArrowLeft className="h-4 w-4" /> Histórico</Link></Button></div></div>;
  }
  return <RelatorioOficial p={data.p} operadorNome={data.nome} />;
}

type DadosRelatorio = Awaited<ReturnType<typeof carregarAtividades>>;

function RelatorioOficial({ p, operadorNome }: { p: Plantao; operadorNome: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plantao", "pdf", p.id],
    queryFn: () => carregarAtividades(p),
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Consolidando somente os lançamentos e alterações do plantão…</div>;
  if (isError || !data) return <div className="mx-auto mt-10 max-w-2xl space-y-4 rounded-xl border border-red-200 bg-white p-6"><p className="font-semibold text-red-700">Não foi possível consolidar os dados.</p><p className="text-sm text-slate-600">{error instanceof Error ? error.message : "Erro ao carregar as atividades."}</p><Button variant="outline" onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button></div>;

  const imprimir = () => window.print();
  const dataHora = (v?: string | null) => v ? new Date(v).toLocaleString("pt-BR") : "—";
  const endereco = (o: DadosRelatorio["ocorrencias"][number]) => [o.endereco, o.numero ? "nº " + o.numero : null, o.bairro].filter(Boolean).join(", ") || "Endereço não informado";
  const statusLabel = p.status === "aberto" ? "Em andamento" : "Encerrado";
  const totalAtividades = data.alteracoes.length + data.ocorrencias.length + data.escalas.length + data.registros.length + data.acoes.length;

  return (
    <main className="report-screen min-h-screen bg-slate-100 px-3 py-5 text-slate-800 sm:px-6">
      <style>{`
        @page { size: A4 portrait; margin: 7mm 8mm 8mm; }
        @media print {
          html, body, #root {
            background: #fff !important;
            color: #172033 !important;
            color-scheme: light !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-screen {
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            color: #172033 !important;
          }
          .report-paper {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #172033 !important;
            color-scheme: light !important;
            overflow: visible !important;
          }
          .report-paper * {
            color-scheme: light !important;
            box-shadow: none !important;
          }
          .report-paper .report-cover {
            background: #fff !important;
            color: #172033 !important;
            border-bottom: 2px solid #0e7490 !important;
          }
          .report-paper .bg-white { background: #fff !important; }
          .report-paper .bg-slate-50 { background: #f8fafc !important; }
          .report-paper .bg-slate-100 { background: #f1f5f9 !important; }
          .report-paper .bg-cyan-50 { background: #ecfeff !important; }
          .report-paper .text-slate-400 { color: #94a3b8 !important; }
          .report-paper .text-slate-500 { color: #64748b !important; }
          .report-paper .text-slate-600 { color: #475569 !important; }
          .report-paper .text-slate-700 { color: #334155 !important; }
          .report-paper .text-slate-800 { color: #1e293b !important; }
          .report-paper .text-cyan-700,
          .report-paper .text-cyan-800 { color: #0e7490 !important; }
          .report-toolbar { display: none !important; }
          .report-body > * + * { margin-top: 10px !important; }
          .report-section { break-inside: auto; }
          .report-card, .report-occurrence, .report-signature, .report-edit-item { break-inside: avoid; }
          .report-table { width: 100% !important; font-size: 8.2px !important; }
          .report-table thead { display: table-header-group; }
          .report-table th, .report-table td { padding: 3.5px 4px !important; }
          .report-kpis { gap: 5px !important; }
          .report-kpi { padding: 6px !important; }
          .report-kpi-value { font-size: 9px !important; margin-top: 1px !important; }
          .report-cover { padding: 9px 12px !important; break-inside: avoid; }
          .report-cover h1 { font-size: 18px !important; margin-top: 3px !important; }
          .report-cover p { margin-top: 2px !important; }
          .report-body { padding: 10px 12px !important; }
          .report-section > div:first-child { padding-bottom: 4px !important; }
          .report-section h2 { font-size: 11px !important; }
          .report-section .space-y-3 > * + * { margin-top: 4px !important; }
          .report-occurrence > div:first-child { padding-top: 5px !important; padding-bottom: 5px !important; }
          .report-occurrence .grid { gap: 4px !important; padding-top: 5px !important; padding-bottom: 5px !important; }
          .report-signature { padding: 9px !important; }
          .report-signature .mt-12 { margin-top: 20px !important; }
          .report-footer { padding-top: 5px !important; }
          .report-page-break { break-before: page; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>

      <div className="report-toolbar mx-auto mb-4 flex max-w-[920px] flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"><Link to="/historico"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao histórico</Link></Button>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">Somente lançamentos e alterações registrados no período do plantão.</span>
          <Button onClick={imprimir} className="bg-cyan-700 text-white shadow-md hover:bg-cyan-800"><Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF</Button>
        </div>
      </div>

      <article className="report-paper mx-auto max-w-[920px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
        <header className="report-cover relative overflow-hidden border-b-2 border-cyan-700 bg-white px-5 py-5 text-slate-900 sm:px-7 sm:py-6">
          <div className="absolute inset-y-0 left-0 w-1 bg-cyan-600" />
          <div className="absolute -right-12 -top-16 h-32 w-32 rounded-full border-[12px] border-cyan-900/5" />
          <div className="absolute -right-2 top-5 h-20 w-20 rounded-full border border-cyan-700/10" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"><ShieldCheck className="h-6 w-6 text-cyan-700" /></div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-700">Guarda Civil Municipal</div>
                <div className="mt-1 text-[10px] font-medium tracking-[0.12em] text-slate-600">ARAÇOIABA DA SERRA · SP</div>
                <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">Relatório de Plantão</h1>
                <p className="mt-1 max-w-md text-xs text-slate-600">Central de Atendimento e Despacho · Registro operacional oficial</p>
              </div>
            </div>
            <div className="relative rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-700">Situação</div>
              <div className="mt-1 text-xs font-extrabold uppercase tracking-wide text-slate-800">{statusLabel}</div>
              <div className="mt-1 text-xs text-slate-600">{fmtDia(p.data_inicio)} · {p.turno || "Turno não informado"}</div>
            </div>
          </div>
          <div className="relative mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2 text-[9px] text-slate-500">
            <span>DOCUMENTO OPERACIONAL · USO INSTITUCIONAL</span><span>Referência: {String(p.id).slice(0, 12).toUpperCase()}</span>
          </div>
        </header>

        <div className="report-body space-y-5 px-5 py-5 sm:px-8 sm:py-6">
          <section className="report-kpis grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label="Data" value={fmtDia(p.data_inicio)} accent="cyan" />
            <Kpi label="Turno" value={p.turno || "—"} accent="blue" />
            <Kpi label="Itens editados" value={String(totalAtividades)} accent="green" />
            <Kpi label="Ocorrências" value={String(data.ocorrencias.length)} accent="amber" />
          </section>

          <ReportSection title="Identificação do plantão" eyebrow="01 · Referência">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-3">
              <Info label="Operador responsável" value={operadorNome} />
              <Info label="Supervisor" value={p.supervisor} />
              <Info label="Operador de rádio" value={p.operador_radio} />
              <Info label="Nome do plantão" value={p.nome_plantao} />
              <Info label="Horário previsto" value={p.horario} />
              <Info label="Início efetivo" value={dataHora(p.iniciado_em)} />
              <Info label="Encerramento efetivo" value={dataHora(p.encerrado_em)} />
              <Info label="Equipe / grupamento" value={p.equipe} />
              <Info label="Período considerado" value={`${dataHora(p.iniciado_em)} até ${dataHora(p.encerrado_em ?? new Date().toISOString())}`} />
            </div>
          </ReportSection>

          <ReportSection title="Itens editados durante o plantão" eyebrow="02 · Auditoria do formulário" count={data.alteracoes.length}>
            {data.alteracoes.length ? (
              <div className="space-y-2">
                {data.alteracoes.map((a) => <AlteracaoItem key={a.campo} alteracao={a} p={p} usuario={data.usuarios[a.usuario_id]} dataHora={dataHora} />)}
              </div>
            ) : (
              <Empty>Nenhum campo do formulário foi alterado durante o período deste plantão.</Empty>
            )}
          </ReportSection>

          <ReportSection title="Ocorrências lançadas ou alteradas" eyebrow="03 · Atendimento e despacho" count={data.ocorrencias.length}>
            {data.ocorrencias.length ? (
              <div className="space-y-2">
                {data.ocorrencias.map((o, i) => (
                  <div key={o.id ?? i} className="report-occurrence overflow-hidden rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-3"><span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-cyan-50 px-2 text-[11px] font-black text-cyan-800">#{o.protocolo || "—"}</span><span className="font-bold text-slate-800">{o.natureza || "Natureza não informada"}</span></div>
                      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-cyan-800">{o.status || "Sem status"}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-2">
                      <Info label="Local da ocorrência" value={endereco(o)} compact />
                      <Info label="Prioridade" value={String(o.prioridade ?? "—")} compact />
                      <Info label="Registro / atualização" value={`${dataHora(o.created_at)} · última alteração ${dataHora(o.updated_at)}`} compact />
                      <Info label="Viatura" value={o.viatura} compact />
                      {o.relato ? <div className="sm:col-span-2"><Info label="Relato" value={o.relato} compact /></div> : null}
                      {o.desfecho ? <div className="sm:col-span-2"><Info label="Desfecho / providências" value={o.desfecho} compact /></div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : <Empty>Nenhuma ocorrência foi lançada ou alterada durante o plantão.</Empty>}
          </ReportSection>

          <ReportSection title="Escalas lançadas ou alteradas" eyebrow="04 · Distribuição do efetivo" count={data.escalas.length}>
            {data.escalas.length ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200 report-card">
                <table className="report-table w-full border-collapse text-left text-xs">
                  <thead><tr>{["Agentes","Função","Horário","Observações"].map(x => <th key={x} className="bg-slate-100 px-3 py-2 font-bold uppercase tracking-wide text-[#193752]">{x}</th>)}</tr></thead>
                  <tbody>{data.escalas.map((e, i) => <tr key={i} className="border-b border-slate-100 even:bg-slate-50"><td className="px-3 py-3 font-semibold">{e.agentes || "—"}</td><td className="px-3 py-3">{e.funcao || "—"}</td><td className="whitespace-nowrap px-3 py-3">{e.hora_inicio || "—"} – {e.hora_fim || "—"}</td><td className="px-3 py-3">{e.observacao || "—"}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <Empty>Nenhuma escala foi lançada ou alterada durante o plantão.</Empty>}
          </ReportSection>

          <ReportSection title="Registros operacionais" eyebrow="05 · Livro de serviço" count={data.registros.length}>
            {data.registros.length ? (
              <div className="space-y-2">{data.registros.map((r, i) => <div key={r.id ?? i} className="border-l-[3px] border-cyan-600 bg-slate-50 px-3 py-2.5"><div className="flex flex-wrap justify-between gap-2 text-[9px] font-bold uppercase tracking-wide text-slate-500"><span>{dataHora(r.hora)}</span><span className="text-cyan-800">{data.usuarios[r.criado_por] || "Operador"}</span></div><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{r.texto}</p></div>)}</div>
            ) : <Empty>Nenhum registro operacional foi lançado durante o plantão.</Empty>}
          </ReportSection>

          <ReportSection title="Histórico de ações" eyebrow="06 · Rastreabilidade das ocorrências" count={data.acoes.length}>
            {data.acoes.length ? (
              <div>{data.acoes.map((a, i) => <div key={i} className="grid grid-cols-[minmax(105px,145px)_1fr] gap-3 border-b border-slate-100 py-2.5 text-xs"><div className="font-medium text-slate-500">{dataHora(a.created_at)}</div><div><div className="font-bold text-[#193752]">{data.usuarios[a.usuario_id] || "Operador"}{a.protocolo ? " · Protocolo #" + a.protocolo : ""}</div><p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-700">{a.descricao}</p></div></div>)}</div>
            ) : <Empty>Nenhuma ação de ocorrência foi registrada durante o plantão.</Empty>}
          </ReportSection>

          <section className="report-section report-signature rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#193752]">Conferência e responsabilidade</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">Documento consolidado exclusivamente com os lançamentos e alterações registrados no período do plantão.</p>
            <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2"><div className="border-t border-slate-400 pt-2"><div className="text-sm font-bold">{operadorNome || " "}</div><div className="mt-1 text-xs text-slate-500">Operador responsável</div></div><div className="border-t border-slate-400 pt-2"><div className="text-sm font-bold">{p.supervisor || " "}</div><div className="mt-1 text-xs text-slate-500">Supervisor do turno</div></div></div>
          </section>

          <footer className="report-footer flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400"><span>CAD · Guarda Civil Municipal de Araçoiaba da Serra</span><span>Relatório gerado em {new Date().toLocaleString("pt-BR")}</span></footer>
        </div>
      </article>
    </main>
  );
}

function AlteracaoItem({ alteracao, p, usuario, dataHora }: { alteracao: AlteracaoPlantao; p: Plantao; usuario?: string; dataHora: (v?: string | null) => string }) {
  const valorAtual = () => {
    switch (alteracao.campo) {
      case "guarnicoes": return p.guarnicoes;
      case "postos": return p.postos;
      case "supervisor_id": return p.supervisor || "—";
      case "operador_radio_id": return p.operador_radio || "—";
      case "nome_plantao": return p.nome_plantao || "—";
      case "data_inicio": return fmtDia(p.data_inicio);
      case "equipe": return p.equipe || "—";
      case "supervisor": return p.supervisor || "—";
      case "operador_radio": return p.operador_radio || "—";
      case "horario": return p.horario || "—";
      case "atividades": return p.atividades || "—";
      case "materiais": return p.materiais || "—";
      case "informativo": return p.informativo || "—";
      case "atividades_verso": return p.atividades_verso || "—";
      case "turno": return p.turno || "—";
      default: return String(alteracao.valor ?? "—");
    }
  };

  const valor = valorAtual();

  return (
    <div className="report-edit-item overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="text-xs font-extrabold text-slate-800">{alteracao.label}</div>
        <div className="text-[9px] font-medium text-slate-500">{dataHora(alteracao.created_at)} · {usuario || "Operador"}</div>
      </div>
      {alteracao.campo === "guarnicoes" && Array.isArray(valor) ? (
        <div className="overflow-x-auto p-2"><table className="report-table w-full border-collapse text-left text-[10px]"><thead><tr>{["VTR","Encarregado","Condutor","Aux. 01","Aux. 02"].map(x => <th key={x} className="bg-slate-100 px-2 py-1.5 font-bold uppercase text-[#164e63]">{x}</th>)}</tr></thead><tbody>{valor.map((g, i) => <tr key={i} className="border-b border-slate-100 even:bg-slate-50"><td className="px-2 py-1.5 font-bold">{g.viatura || "—"}</td><td className="px-2 py-1.5">{g.encarregado || "—"}</td><td className="px-2 py-1.5">{g.condutor || "—"}</td><td className="px-2 py-1.5">{g.aux1 || "—"}</td><td className="px-2 py-1.5">{g.aux2 || "—"}</td></tr>)}</tbody></table></div>
      ) : alteracao.campo === "postos" && Array.isArray(valor) ? (
        <div className="grid grid-cols-1 gap-1.5 p-2 sm:grid-cols-2">{valor.map((posto, i) => <div key={i} className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5"><div className="text-[10px] font-bold">{posto.nome || "Posto"}</div><div className="text-[9px] text-slate-600">{posto.ok ? "Conferido" : "Alteração / pendência"}{posto.obs ? ` · ${posto.obs}` : ""}</div></div>)}</div>
      ) : (
        <div className="px-3 py-2.5"><p className="whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-slate-700">{String(valor ?? "—")}</p></div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: "cyan" | "blue" | "green" | "amber" }) {
  const accents = { cyan: "border-t-cyan-500", blue: "border-t-blue-600", green: "border-t-emerald-600", amber: "border-t-amber-500" };
  return <div className={`report-kpi rounded-lg border border-slate-200 border-t-[3px] ${accents[accent]} bg-white p-3 shadow-sm sm:p-4`}><div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="report-kpi-value mt-2 break-words text-base font-extrabold text-[#193752] sm:text-lg">{value}</div></div>;
}

function ReportSection({ title, eyebrow, count, children }: { title: string; eyebrow: string; count?: number; children: React.ReactNode }) {
  return <section className="report-section space-y-3"><div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-slate-200 pb-3"><div><div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-700">{eyebrow}</div><h2 className="mt-1 text-lg font-extrabold tracking-tight text-[#10243a]">{title}</h2></div>{count !== undefined ? <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{count} {count === 1 ? "registro" : "registros"}</span> : null}</div>{children}</section>;
}

function Info({ label, value, compact = false }: { label: string; value?: string | null; compact?: boolean }) {
  return <div className={`min-w-0 border-b border-slate-100 ${compact ? "py-1" : "py-2.5"}`}><div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-800">{value || "—"}</div></div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-xs text-slate-500">{children}</div>;
}

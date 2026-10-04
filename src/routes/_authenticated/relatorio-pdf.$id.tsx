import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { carregarAtividades, fmtDia, type Plantao } from "@/lib/plantao";

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

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">Consolidando ocorrências e registros do plantão…</div>;
  if (isError || !data) return <div className="mx-auto mt-10 max-w-2xl space-y-4 rounded-xl border border-red-200 bg-white p-6"><p className="font-semibold text-red-700">Não foi possível consolidar os dados.</p><p className="text-sm text-slate-600">{error instanceof Error ? error.message : "Erro ao carregar as atividades."}</p><Button variant="outline" onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button></div>;

  const imprimir = () => window.print();
  const dataHora = (v?: string | null) => v ? new Date(v).toLocaleString("pt-BR") : "—";
  const endereco = (o: DadosRelatorio["ocorrencias"][number]) => [o.endereco, o.numero ? "nº " + o.numero : null, o.bairro].filter(Boolean).join(", ") || "Endereço não informado";
  const statusLabel = p.status === "aberto" ? "Em andamento" : "Encerrado";

  return (
    <main className="report-screen min-h-screen bg-slate-100 px-3 py-5 text-slate-800 sm:px-6">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .report-screen { min-height: 0 !important; padding: 0 !important; background: #fff !important; }
          .report-toolbar { display: none !important; }
          .report-paper { max-width: none !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; }
          .report-section { break-inside: avoid; }
          .report-table tr { break-inside: avoid; }
          .report-cover { break-inside: avoid; }
          .report-page-break { break-before: page; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
      <div className="report-toolbar mx-auto mb-4 flex max-w-[900px] flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"><Link to="/historico"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao histórico</Link></Button>
        <div className="flex items-center gap-2"><span className="hidden text-xs text-slate-500 sm:inline">Para gerar o PDF, selecione “Salvar como PDF” na impressão.</span><Button onClick={imprimir} className="bg-cyan-700 bg-cyan-700 text-white shadow-md hover:bg-cyan-800"><Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF</Button></div>
      </div>

      <article className="report-paper mx-auto max-w-[900px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <header className="report-cover relative overflow-hidden bg-white px-5 py-5 text-slate-900 sm:px-7 sm:py-6">
          <div className="absolute inset-y-0 left-0 w-1 bg-cyan-600" />
          <div className="absolute -right-12 -top-16 h-32 w-32 rounded-full border-[12px] border-cyan-900/5" />
          <div className="absolute -right-2 top-5 h-20 w-20 rounded-full border border-cyan-700/10" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/80"><ShieldCheck className="h-6 w-6 text-cyan-700" /></div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-200">Guarda Civil Municipal</div>
                <div className="mt-1 text-[10px] font-medium tracking-[0.12em] text-slate-600">ARAÇOIABA DA SERRA · SP</div>
                <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl">Relatório de<br className="hidden sm:block" /> Plantão</h1>
                <p className="mt-1 max-w-md text-xs text-slate-300">Central de Atendimento e Despacho · Registro operacional oficial</p>
              </div>
            </div>
            <div className="relative rounded-lg border border-cyan-200/30 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-200">Situação do plantão</div>
              <div className="mt-1 text-xs font-extrabold uppercase tracking-wide">{statusLabel}</div>
              <div className="mt-1 text-xs text-slate-300">{fmtDia(p.data_inicio)} · {p.turno || "Turno não informado"}</div>
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-[10px] text-slate-300">
            <span>DOCUMENTO OPERACIONAL · USO INSTITUCIONAL</span><span>Referência: {String(p.id).slice(0, 12).toUpperCase()}</span>
          </div>
        </header>

        <div className="space-y-7 px-5 py-5 sm:px-8 sm:py-7">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Data do plantão" value={fmtDia(p.data_inicio)} accent="cyan" />
            <Kpi label="Turno" value={p.turno || "—"} accent="blue" />
            <Kpi label="Equipe" value={p.equipe || "Não informada"} accent="green" />
            <Kpi label="Ocorrências" value={String(data.ocorrencias.length)} accent="amber" />
          </section>

          <ReportSection title="Identificação do plantão" eyebrow="01 · Dados gerais">
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <Info label="Operador responsável" value={operadorNome} />
              <Info label="Supervisor" value={p.supervisor} />
              <Info label="Operador de rádio" value={p.operador_radio} />
              <Info label="Nome do plantão" value={p.nome_plantao} />
              <Info label="Horário previsto" value={p.horario} />
              <Info label="Início efetivo" value={dataHora(p.iniciado_em)} />
              <Info label="Encerramento efetivo" value={dataHora(p.encerrado_em)} />
              <Info label="Equipe / grupamento" value={p.equipe} />
            </div>
          </ReportSection>

          <ReportSection title="Composição das guarnições" eyebrow="02 · Efetivo e viaturas" count={p.guarnicoes?.length ?? 0}>
            {p.guarnicoes?.length ? <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="report-table w-full border-collapse text-left text-xs"><thead><tr>{["Viatura","Encarregado","Condutor","Auxiliar 1","Auxiliar 2"].map(x=><th key={x} className="bg-[#164e63] px-3 py-3 font-bold uppercase tracking-wide text-white">{x}</th>)}</tr></thead><tbody>{p.guarnicoes.map((g,i)=><tr key={i} className="border-b border-slate-100 even:bg-slate-50"><td className="px-3 py-3 font-bold text-slate-800">{g.viatura || "—"}</td><td className="px-3 py-3">{g.encarregado || "—"}</td><td className="px-3 py-3">{g.condutor || "—"}</td><td className="px-3 py-3">{g.aux1 || "—"}</td><td className="px-3 py-3">{g.aux2 || "—"}</td></tr>)}</tbody></table></div> : <Empty>Nenhuma guarnição informada neste plantão.</Empty>}
          </ReportSection>

          <ReportSection title="Ocorrências atendidas" eyebrow="03 · Atendimento e despacho" count={data.ocorrencias.length}>
            {data.ocorrencias.length ? <div className="space-y-3">{data.ocorrencias.map((o,i)=><div key={o.id ?? i} className="overflow-hidden rounded-lg border border-slate-200"><div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-[#193752] px-2 text-xs font-black text-white">#{o.protocolo || "—"}</span><span className="font-bold text-slate-800">{o.natureza || "Natureza não informada"}</span></div><span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-800">{o.status || "Sem status"}</span></div><div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2"><Info label="Local da ocorrência" value={endereco(o)} compact /><Info label="Prioridade" value={String(o.prioridade ?? "—")} compact />{o.relato ? <div className="sm:col-span-2"><Info label="Relato" value={o.relato} compact /></div> : null}{o.desfecho ? <div className="sm:col-span-2"><Info label="Desfecho / providências" value={o.desfecho} compact /></div> : null}</div></div>)}</div> : <Empty>Nenhuma ocorrência vinculada ao plantão.</Empty>}
          </ReportSection>

          <ReportSection title="Escala operacional" eyebrow="04 · Distribuição do efetivo" count={data.escalas.length}>
            {data.escalas.length ? <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="report-table w-full border-collapse text-left text-xs"><thead><tr>{["Agentes","Função","Horário","Observações"].map(x=><th key={x} className="bg-[#193752] px-3 py-3 font-bold uppercase tracking-wide text-white">{x}</th>)}</tr></thead><tbody>{data.escalas.map((e,i)=><tr key={i} className="border-b border-slate-100 even:bg-slate-50"><td className="px-3 py-3 font-semibold">{e.agentes || "—"}</td><td className="px-3 py-3">{e.funcao || "—"}</td><td className="px-3 py-3 whitespace-nowrap">{e.hora_inicio || "—"} – {e.hora_fim || "—"}</td><td className="px-3 py-3">{e.observacao || "—"}</td></tr>)}</tbody></table></div> : <Empty>Nenhuma escala operacional registrada.</Empty>}
          </ReportSection>

          <ReportSection title="Postos e conferências" eyebrow="05 · Checklist do turno" count={p.postos?.length ?? 0}>
            {p.postos?.length ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{p.postos.map((posto,i)=>{const obj=typeof posto==="object"&&posto!==null?posto as {nome?:string;ok?:boolean;obs?:string}:null;const nome=typeof posto==="string"?posto:(obj?.nome||"Posto "+(i+1));return <div key={i} className="flex gap-3 rounded-lg border border-slate-200 p-3"><div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${obj?.ok?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>{obj?.ok?"✓":"•"}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{nome}</div><div className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${obj?.ok?"text-emerald-700":"text-amber-700"}`}>{obj?.ok?"Conferido":"Pendente / não confirmado"}</div>{obj?.obs?<p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{obj.obs}</p>:null}</div></div>})}</div> : <Empty>Nenhum posto ou item de conferência informado.</Empty>}
          </ReportSection>

          <ReportSection title="Registros operacionais" eyebrow="06 · Livro de serviço" count={data.registros.length}>
            {data.registros.length ? <div className="space-y-3">{data.registros.map((r,i)=><div key={r.id ?? i} className="border-l-[3px] border-cyan-600 bg-slate-50 px-4 py-3"><div className="flex flex-wrap justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>{dataHora(r.hora)}</span><span className="text-[#164e63]">{data.usuarios[r.criado_por] || "Operador"}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.texto}</p></div>)}</div> : <Empty>Nenhum registro operacional lançado.</Empty>}
          </ReportSection>

          <ReportSection title="Histórico de ações" eyebrow="07 · Rastreabilidade" count={data.acoes.length}>
            {data.acoes.length ? <div className="space-y-0">{data.acoes.map((a,i)=><div key={i} className="grid grid-cols-[minmax(110px,155px)_1fr] gap-3 border-b border-slate-100 py-3 text-xs"><div className="font-medium text-slate-500">{dataHora(a.created_at)}</div><div><div className="font-bold text-[#193752]">{data.usuarios[a.usuario_id] || "Operador"}{a.protocolo ? " · Protocolo #"+a.protocolo : ""}</div><p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-700">{a.descricao}</p></div></div>)}</div> : <Empty>Nenhuma ação registrada no histórico.</Empty>}
          </ReportSection>

          <ReportSection title="Informações complementares" eyebrow="08 · Observações do turno">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{([["Atividades",p.atividades],["Materiais",p.materiais],["Informativo",p.informativo],["Atividades — verso",p.atividades_verso],["Observações gerais",p.observacoes]] as [string,string|null|undefined][]).filter(([,v])=>!!v).map(([label,value])=><div key={label} className="rounded-lg border border-slate-200 p-4"><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-800">{label}</div><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{value}</p></div>)}</div>
            {![p.atividades,p.materiais,p.informativo,p.atividades_verso,p.observacoes].some(Boolean) ? <Empty>Nenhuma informação complementar registrada.</Empty> : null}
          </ReportSection>

          <section className="report-section rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#193752]">Conferência e responsabilidade</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">Confirmo que as informações deste documento correspondem aos registros lançados no sistema durante o plantão.</p>
            <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2"><div className="border-t border-slate-400 pt-2"><div className="text-sm font-bold">{operadorNome || " "}</div><div className="mt-1 text-xs text-slate-500">Operador responsável</div></div><div className="border-t border-slate-400 pt-2"><div className="text-sm font-bold">{p.supervisor || " "}</div><div className="mt-1 text-xs text-slate-500">Supervisor do turno</div></div></div>
          </section>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400"><span>CAD · Guarda Civil Municipal de Araçoiaba da Serra</span><span>Relatório gerado em {new Date().toLocaleString("pt-BR")}</span></footer>
        </div>
      </article>
    </main>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: "cyan" | "blue" | "green" | "amber" }) {
  const accents = { cyan: "border-t-cyan-500", blue: "border-t-blue-600", green: "border-t-emerald-600", amber: "border-t-amber-500" };
  return <div className={`rounded-lg border border-slate-200 border-t-[3px] ${accents[accent]} bg-white p-3 shadow-sm sm:p-4`}><div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="mt-2 break-words text-base font-extrabold text-[#193752] sm:text-lg">{value}</div></div>;
}

function ReportSection({ title, eyebrow, count, children }: { title: string; eyebrow: string; count?: number; children: React.ReactNode }) {
  return <section className="report-section space-y-3"><div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-slate-200 pb-3"><div><div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-700">{eyebrow}</div><h2 className="mt-1 text-lg font-extrabold tracking-tight text-[#10243a]">{title}</h2></div>{count !== undefined ? <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{count} {count === 1 ? "registro" : "registros"}</span> : null}</div>{children}</section>;
}

function Info({ label, value, compact = false }: { label: string; value?: string | null; compact?: boolean }) {
  return <div className={`min-w-0 border-b border-slate-100 ${compact ? "py-1" : "py-3"}`}><div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-800">{value || "—"}</div></div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">{children}</div>;
}

function formatarDataHora(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

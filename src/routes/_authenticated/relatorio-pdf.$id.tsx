import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { carregarAtividades, fmtDia, type Plantao } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/relatorio-pdf/$id")({
  head: () => ({ meta: [{ title: "Relatório de plantão · CAD" }] }),
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

  if (carregandoPerfil || isLoading) return <div className="text-muted-foreground">Carregando plantão finalizado...</div>;
  if (!me) return <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Sua sessão não foi identificada. Saia e entre novamente no CAD.</div>;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 rounded-lg border border-destructive/40 p-5">
        <div className="flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="h-5 w-5" /> Não foi possível abrir este plantão</div>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Ocorreu um erro ao consultar o plantão no banco de dados."}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>
          <Button asChild variant="outline"><Link to="/historico"><ArrowLeft className="h-4 w-4" /> Voltar ao histórico</Link></Button>
        </div>
      </div>
    );
  }

  const { p, nome } = data;
  return <RelatorioPdfPlantao p={p} operadorNome={nome} />;
}

function RelatorioPdfPlantao({ p, operadorNome }: { p: Plantao; operadorNome: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["plantao", "pdf", p.id],
    queryFn: () => carregarAtividades(p),
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;

    const blob = gerarPdfPlantao(p, operadorNome, data);
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);

    const imprimir = () => {
    if (!pdfUrl) return;
    const win = window.open(pdfUrl, "_blank", "noopener,noreferrer");
    if (!win) window.location.assign(pdfUrl);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700 bg-slate-950 px-4 py-3 text-white shadow-lg">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">CAD GUARDA CIVIL MUNICIPAL</div>
          <div className="truncate text-sm font-semibold">Relatório de plantão · {fmtDia(p.data_inicio)}</div>
        </div>
        <Button type="button" onClick={imprimir} className="shrink-0 gap-2 bg-cyan-600 text-white hover:bg-cyan-500">
          <Printer className="h-4 w-4" /> Imprimir PDF
        </Button>
      </header>
      <div className="min-h-0 flex-1 bg-slate-800 p-2 sm:p-4">
        <embed src={pdfUrl} type="application/pdf" className="h-full w-full rounded-sm border border-slate-700 bg-white shadow-2xl" aria-label={`Relatório PDF do plantão ${p.id}`} />
      </div>
    </div>
  )
}

type DadosRelatorioPlantao = Awaited<ReturnType<typeof carregarAtividades>>;

function gerarPdfPlantao(p: Plantao, operadorNome: string, data: DadosRelatorioPlantao): Blob {
  const linhas: string[] = [];
  const add = (text = "") => linhas.push(text);
  const section = (title: string) => {
    add("");
    add(title.toUpperCase());
    add("-".repeat(Math.min(78, Math.max(20, title.length + 8))));
  };
  const campo = (label: string, value?: string | null) => add(`${label}: ${value || "—"}`);

  add("GUARDA CIVIL MUNICIPAL");
  add("CENTRAL DE ATENDIMENTO E DESPACHO");
  add("RELATORIO DE PLANTAO");
  add("");
  campo("Data", fmtDia(p.data_inicio));
  campo("Turno", p.turno);
  campo("Status", p.status);
  campo("Operador", operadorNome);
  campo("Equipe", p.equipe);
  campo("Supervisor", p.supervisor);
  campo("Horario", p.horario);
  campo("Inicio", formatarDataHora(p.iniciado_em));
  campo("Encerramento", formatarDataHora(p.encerrado_em));
  campo("Nome do plantao", p.nome_plantao);
  campo("Operador de radio", p.operador_radio);

  section("Guarnicoes");
  if (p.guarnicoes?.length) {
    p.guarnicoes.forEach((g, i) => {
      add(`Guarnicao ${i + 1}`);
      campo("  Viatura", g.viatura);
      campo("  Encarregado", g.encarregado);
      campo("  Condutor", g.condutor);
      campo("  Auxiliar 1", g.aux1);
      campo("  Auxiliar 2", g.aux2);
    });
  } else add("Nenhuma guarnicao registrada.");

  section("Postos e conferencias");
  if (p.postos?.length) {
    p.postos.forEach((posto, i) => add(`${i + 1}. ${typeof posto === "string" ? posto : JSON.stringify(posto)}`));
  } else add("Nenhum posto ou conferencia registrado.");

  section("Ocorrencias do plantao");
  if (data.ocorrencias.length) {
    data.ocorrencias.forEach((o) => {
      add(`Protocolo: ${o.protocolo || "—"}`);
      campo("  Natureza", o.natureza);
      campo("  Endereco", [o.endereco, o.numero, o.bairro].filter(Boolean).join(", "));
      campo("  Status", o.status);
      campo("  Desfecho", o.desfecho);
      add("");
    });
  } else add("Nenhuma ocorrencia registrada.");

  section("Registros operacionais");
  if (data.registros.length) {
    data.registros.forEach((r) => add(`${formatarDataHora(r.hora)} — ${data.usuarios[r.criado_por] ?? "Operador"}: ${r.texto}`));
  } else add("Nenhum registro operacional.");

  section("Acoes e historico");
  if (data.acoes.length) {
    data.acoes.forEach((a) =>
      add(`${formatarDataHora(a.created_at)} — ${data.usuarios[a.usuario_id] ?? "Operador"}${a.protocolo ? ` · Protocolo ${a.protocolo}` : ""}: ${a.descricao}`),
    );
  } else add("Nenhuma acao registrada.");

  section("Informacoes registradas");
  campo("Atividades", p.atividades);
  campo("Materiais", p.materiais);
  campo("Informativo", p.informativo);
  campo("Atividades - verso", p.atividades_verso);
  campo("Observacoes", p.observacoes);

  add("");
  add("Documento gerado pelo CAD Guarda Civil Municipal.");
  add("Operador responsavel: ______________________________");
  add("Supervisor de turno:   ______________________________");

  return criarPdfTexto(linhas);
}

function criarPdfTexto(linhas: string[]): Blob {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 42;
  const marginRight = 42;
  const top = 54;
  const bottom = 48;
  const maxChars = 88;
  const lineStep = 13;

  type Cmd = { text: string; x: number; y: number; size: number; bold: boolean; gray?: boolean };
  const pages: Cmd[][] = [];
  let page: Cmd[] = [];
  let y = pageHeight - top;

  const newPage = () => {
    if (page.length) pages.push(page);
    page = [];
    y = pageHeight - top;
  };
  const ensure = (height: number) => {
    if (y - height < bottom) newPage();
  };
  const wrap = (value: string, limit = maxChars) => {
    const out: string[] = [];
    let rest = value || " ";
    while (rest.length > limit) {
      let cut = rest.lastIndexOf(" ", limit);
      if (cut < 16) cut = limit;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    out.push(rest || " ");
    return out;
  };

  for (let i = 0; i < linhas.length; i++) {
    const raw = linhas[i] ?? "";
    if (!raw) { y -= 7; continue; }

    const isHeader = i === 0 || i === 1;
    const isHero = raw === "RELATORIO DE PLANTAO";
    const isSection = /^[A-ZÁÉÍÓÚÃÕÇ0-9 ]+$/.test(raw) && raw.length > 4 && !raw.includes(":") && !raw.startsWith("GUARNICAO ");
    const isRule = /^-+$/.test(raw);

    if (isHeader) {
      ensure(20);
      page.push({ text: raw, x: marginLeft, y, size: i === 0 ? 12 : 8.5, bold: true, gray: i === 1 });
      y -= i === 0 ? 18 : 14;
      continue;
    }
    if (isHero) {
      ensure(42);
      page.push({ text: raw, x: marginLeft, y, size: 18, bold: true });
      y -= 25;
      page.push({ text: "Documento oficial de encerramento e conferência operacional", x: marginLeft, y, size: 8, bold: false, gray: true });
      y -= 18;
      continue;
    }
    if (isRule) {
      ensure(10);
      page.push({ text: "________________________________________________________________________________", x: marginLeft, y, size: 7, bold: false, gray: true });
      y -= 14;
      continue;
    }
    if (isSection) {
      ensure(30);
      page.push({ text: raw, x: marginLeft, y, size: 10, bold: true });
      y -= 7;
      page.push({ text: "________________________________________________________________________________", x: marginLeft, y, size: 7, bold: false, gray: true });
      y -= 17;
      continue;
    }

    const lines = wrap(raw);
    ensure(lines.length * lineStep + 3);
    lines.forEach((line, index) => {
      const field = /^\s{0,2}[^:]{1,28}:/.test(line);
      page.push({ text: line, x: marginLeft + (index ? 12 : 0), y, size: field && index === 0 ? 8.7 : 8.2, bold: field && index === 0 });
      y -= lineStep;
    });
    y -= 2;
  }
  newPage();

  const objects: string[] = [];
  const addObject = (body: string) => { objects.push(body); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];

  pages.forEach((commands, pageIndex) => {
    const streamParts = [
      "q",
      "0.93 0.95 0.97 rg",
      `42 ${pageHeight - 40} 511 1.2 re f`,
      "Q",
      "BT",
    ];
    commands.forEach((cmd) => {
      streamParts.push(
        cmd.gray ? "0.40 g" : "0.08 g",
        `/${cmd.bold ? "F2" : "F1"} ${cmd.size} Tf`,
        `1 0 0 1 ${cmd.x} ${cmd.y} Tm`,
        `(${pdfEscape(winAnsi(cmd.text))}) Tj`,
      );
    });
    streamParts.push(
      "0.45 g",
      "/F1 7 Tf",
      "1 0 0 1 42 24 Tm",
      `(CAD Guarda Civil Municipal  |  Relatório de plantão  |  Página ${pageIndex + 1} de ${pages.length}) Tj`,
      "ET",
    );

    const stream = streamParts.join("\n");
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
}

function winAnsi(value: string): string {
  return value
    .replace(/\u20AC/g, "\x80")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2022/g, "*")
    .replace(/[\u00A0]/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, (mark) => {
      const map: Record<string, string> = {
        "\u0300": "\x60",
        "\u0301": "\xB4",
        "\u0302": "\x5E",
        "\u0303": "\x7E",
        "\u0308": "\xA8",
      };
      return map[mark] ?? "";
    });
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function SecaoPdf({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="space-y-2 break-inside-avoid"><h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase">{titulo}</h2>{children}</section>;
}

function Campo({ l, v }: { l: string; v?: string | null }) {
  return <div className="min-w-0"><div className="text-[10px] font-bold uppercase text-gray-600">{l}</div><div className="whitespace-pre-wrap">{v || "—"}</div></div>;
}

function VazioPdf() {
  return <div className="text-xs text-gray-500">Nenhum registro lançado durante o plantão.</div>;
}

function formatarDataHora(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

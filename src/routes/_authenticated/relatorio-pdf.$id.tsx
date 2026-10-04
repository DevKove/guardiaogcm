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
    return () => URL.revokeObjectURL(url);
  }, [p, operadorNome, data]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Gerando PDF do plantão...</div>;
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 rounded-lg border border-destructive/40 p-5">
        <div className="flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="h-5 w-5" /> Não foi possível gerar o PDF</div>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Erro ao carregar os dados do plantão."}</p>
        <Button asChild variant="outline"><Link to="/historico"><ArrowLeft className="h-4 w-4" /> Voltar ao histórico</Link></Button>
      </div>
    );
  }
  if (!pdfUrl) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Preparando o documento PDF...</div>;
  }

  const imprimir = () => {
    const win = window.open(pdfUrl, "_blank", "noopener,noreferrer");
    if (!win) window.location.assign(pdfUrl);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700 bg-slate-950 px-4 py-3 text-white shadow-lg">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">CAD GUARDA CIVIL MUNICIPAL <span className="ml-2 rounded border border-cyan-400/40 px-2 py-0.5 text-[10px] tracking-normal text-cyan-300">PDF V3</span></div>
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
  );
}

type DadosRelatorioPlantao = Awaited<ReturnType<typeof carregarAtividades>>;

type PdfCmd =
  | { kind: "text"; text: string; x: number; y: number; size: number; font: "F1" | "F2"; color: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string; radius?: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number };

function gerarPdfPlantao(p: Plantao, operadorNome: string, data: DadosRelatorioPlantao): Blob {
  const W = 595.28;
  const H = 841.89;
  const M = 38;
  const contentW = W - M * 2;
  const navy = "#10243A";
  const navy2 = "#193752";
  const cyan = "#16B8C8";
  const ink = "#172B3A";
  const muted = "#647789";
  const pale = "#F1F6F9";
  const line = "#DCE6EC";
  const white = "#FFFFFF";
  const green = "#15836D";
  const amber = "#A66A12";
  const red = "#B54343";
  const pages: PdfCmd[][] = [];
  let cmds: PdfCmd[] = [];
  let y = H - 42;
  let pageNo = 1;

  const rgb = (hex: string) => {
    const h = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  };
  const text = (value: unknown, x: number, yy: number, size = 8.5, color = ink, bold = false) => {
    const str = String(value ?? "—");
    cmds.push({ kind: "text", text: str, x, y: yy, size, color, font: bold ? "F2" : "F1" });
  };
  const rect = (x: number, yy: number, w: number, h: number, color: string) => {
    cmds.push({ kind: "rect", x, y: yy, w, h, color });
  };
  const rule = (x1: number, y1: number, x2: number, y2: number, color = line, width = 0.7) => {
    cmds.push({ kind: "line", x1, y1, x2, y2, color, width });
  };
  const wrap = (value: unknown, maxWidth: number, size: number) => {
    const raw = String(value ?? "—").replace(/\r/g, "");
    const out: string[] = [];
    const paragraphs = raw.split("\n");
    const maxChars = Math.max(8, Math.floor(maxWidth / (size * 0.51)));
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(""); continue; }
      let current = "";
      for (const word of words) {
        if (word.length > maxChars) {
          if (current) { out.push(current); current = ""; }
          for (let i = 0; i < word.length; i += maxChars) out.push(word.slice(i, i + maxChars));
          continue;
        }
        const next = current ? current + " " + word : word;
        if (next.length > maxChars && current) { out.push(current); current = word; }
        else current = next;
      }
      if (current) out.push(current);
    }
    return out.length ? out : ["—"];
  };
  const addPage = () => {
    if (cmds.length) pages.push(cmds);
    cmds = [];
    pageNo += 1;
    y = H - 42;
    rect(0, H - 7, W, 7, cyan);
    text("GUARDA CIVIL MUNICIPAL  /  CENTRAL DE ATENDIMENTO E DESPACHO", M, H - 29, 7.2, muted, true);
    rule(M, H - 38, W - M, H - 38, line, 0.8);
    y = H - 58;
  };
  const ensure = (height: number) => {
    if (y - height < 55) addPage();
  };
  const drawTextBlock = (value: unknown, x: number, topY: number, width: number, size = 8.2, color = ink, bold = false, leading = 11.2) => {
    const lines = wrap(value, width, size);
    lines.forEach((ln, i) => text(ln, x, topY - i * leading, size, color, bold));
    return lines.length * leading;
  };
  const section = (title: string, detail?: string) => {
    ensure(43);
    y -= 6;
    rect(M, y - 13, 3, 20, cyan);
    text(title.toLocaleUpperCase("pt-BR"), M + 12, y, 9.1, navy, true);
    if (detail) text(detail, W - M - Math.min(190, detail.length * 4.1), y + 0.5, 7.2, muted, false);
    rule(M + 12, y - 7, W - M, y - 7, line, 0.7);
    y -= 25;
  };
  const empty = (message: string) => {
    ensure(28);
    rect(M, y - 13, contentW, 23, pale);
    text(message, M + 10, y - 4, 8, muted, false);
    y -= 30;
  };
  const field = (label: string, value: unknown, x: number, topY: number, width: number, size = 8.4) => {
    text(label.toLocaleUpperCase("pt-BR"), x, topY, 6.4, muted, true);
    const used = drawTextBlock(value || "—", x, topY - 13, width, size, ink, true, 10.5);
    return Math.max(29, used + 16);
  };
  const card = (x: number, topY: number, width: number, height: number, label: string, value: unknown, accent: string) => {
    rect(x, topY - height, width, height, pale);
    rect(x, topY - height, 3, height, accent);
    text(label.toLocaleUpperCase("pt-BR"), x + 10, topY - 13, 6.3, muted, true);
    drawTextBlock(value || "—", x + 10, topY - 29, width - 19, 9.2, navy, true, 11);
  };
  const tableRow = (cells: { value: unknown; width: number }[], options?: { header?: boolean; fill?: string; height?: number; color?: string }) => {
    const header = !!options?.header;
    const rowTop = y;
    const heights = cells.map((c) => wrap(c.value, c.width - 12, header ? 6.8 : 7.4).length * (header ? 8.5 : 9.5) + 10);
    const h = options?.height ?? Math.max(header ? 24 : 25, ...heights);
    ensure(h + 2);
    const actualTop = y;
    if (options?.fill || header) rect(M, actualTop - h, contentW, h, options?.fill ?? navy2);
    let x = M + 7;
    cells.forEach((c) => {
      drawTextBlock(c.value, x, actualTop - (header ? 14 : 13), c.width - 12, header ? 6.8 : 7.4, header ? white : (options?.color ?? ink), header, header ? 8.5 : 9.5);
      x += c.width;
    });
    if (!header) rule(M, actualTop - h, W - M, actualTop - h, line, 0.55);
    y = actualTop - h;
  };
  const labelValue = (label: string, value: unknown, indent = 0) => {
    const x = M + 8 + indent;
    const width = contentW - 16 - indent;
    const labelW = Math.min(90, Math.max(48, label.length * 4.2));
    const valueLines = wrap(value || "—", width - labelW - 8, 7.8);
    const h = Math.max(20, valueLines.length * 10 + 9);
    ensure(h);
    text(label, x, y - 12, 7.4, muted, true);
    drawTextBlock(value || "—", x + labelW, y - 12, width - labelW, 7.8, ink, false, 10);
    rule(x, y - h, W - M - 5, y - h, line, 0.45);
    y -= h;
  };
  const fmt = (v?: string | null) => formatarDataHora(v);
  const address = (o: DadosRelatorioPlantao["ocorrencias"][number]) =>
    [o.endereco, o.numero ? "nº " + o.numero : null, o.bairro].filter(Boolean).join(", ") || "Endereço não informado";
  const statusColor = (status: string) => /encerrad|conclu/i.test(status) ? green : /pendente|aberta|aguard/i.test(status) ? amber : cyan;

  // Capa institucional V2: hierarquia visual forte e identificador explícito da nova edição.
  rect(0, H - 178, W, 178, navy);
  rect(0, H - 178, 8, 178, cyan);
  rect(8, H - 178, W - 8, 5, cyan);
  rect(W - 154, H - 47, 116, 18, navy2);
  text("RELATÓRIO OFICIAL", W - 146, H - 40, 6.2, "#7DE4ED", true);
  text("GUARDA CIVIL MUNICIPAL", M + 8, H - 36, 8, "#7DE4ED", true);
  text("ARAÇOIABA DA SERRA  |  SP", M + 8, H - 52, 7.2, "#D8E6EF", false);
  text("RELATÓRIO DE PLANTÃO", M + 8, H - 88, 21, white, true);
  text("CENTRAL DE ATENDIMENTO E DESPACHO", M + 8, H - 107, 8, "#D8E6EF", true);
  text("NOVO LAYOUT INSTITUCIONAL  •  VERSÃO 3.0", M + 8, H - 125, 6.8, "#7DE4ED", true);
  const status = p.status || "Não informado";
  rect(W - M - 116, H - 88, 108, 24, statusColor(status));
  text(status.toLocaleUpperCase("pt-BR"), W - M - 108, H - 79, 7, white, true);
  rule(M + 8, H - 143, W - M, H - 143, "#36536B", 0.8);
  text("Documento gerado pelo sistema CAD • Registro do plantão", M + 8, H - 158, 6.5, "#D8E6EF", false);
  y = H - 207;

  const gap = 9;
  const cardW = (contentW - gap * 3) / 4;
  card(M, y, cardW, 49, "Data", fmtDia(p.data_inicio), cyan);
  card(M + cardW + gap, y, cardW, 49, "Turno", p.turno, green);
  card(M + (cardW + gap) * 2, y, cardW, 49, "Equipe", p.equipe, "#5479C7");
  card(M + (cardW + gap) * 3, y, cardW, 49, "Ocorrências", String(data.ocorrencias.length), amber);
  y -= 65;

  section("Identificação do plantão", "DADOS GERAIS");
  const colGap = 18;
  const colW = (contentW - colGap) / 2;
  const leftFields: [string, string | null | undefined][] = [
    ["Operador responsável", operadorNome],
    ["Supervisor", p.supervisor],
    ["Operador de rádio", p.operador_radio],
    ["Nome do plantão", p.nome_plantao],
    ["Equipe / grupamento", p.equipe],
  ];
  const rightFields: [string, string | null | undefined][] = [
    ["Horário previsto", p.horario],
    ["Início efetivo", fmt(p.iniciado_em)],
    ["Encerramento efetivo", fmt(p.encerrado_em)],
    ["Situação", p.status],
    ["Identificação", p.id],
  ];
  const metaTop = y;
  leftFields.forEach((left, i) => {
    const right = rightFields[i];
    const rowHeight = Math.max(
      field(left[0], left[1], M + 5, y, colW - 8),
      right ? field(right[0], right[1], M + colW + colGap, y, colW - 5) : 0,
    );
    y -= rowHeight;
  });
  y = Math.min(y, metaTop - 140);
  section("Guarnições", p.guarnicoes?.length ? String(p.guarnicoes.length) + " equipe(s)" : "SEM REGISTRO");
  if (p.guarnicoes?.length) {
    const widths: [number, number, number, number, number] = [contentW * 0.17, contentW * 0.23, contentW * 0.20, contentW * 0.20, contentW * 0.20];
    tableRow([
      { value: "VIATURA", width: widths[0] }, { value: "ENCARREGADO", width: widths[1] },
      { value: "CONDUTOR", width: widths[2] }, { value: "AUXILIAR 1", width: widths[3] }, { value: "AUXILIAR 2", width: widths[4] },
    ], { header: true, height: 24 });
    p.guarnicoes.forEach((g) => tableRow([
      { value: g.viatura, width: widths[0] }, { value: g.encarregado, width: widths[1] },
      { value: g.condutor, width: widths[2] }, { value: g.aux1, width: widths[3] }, { value: g.aux2, width: widths[4] },
    ]));
  } else empty("Nenhuma guarnição foi informada para este plantão.");

  section("Ocorrências atendidas", String(data.ocorrencias.length) + " registro(s)");
  if (data.ocorrencias.length) {
    const widths: [number, number, number, number, number] = [contentW * 0.14, contentW * 0.22, contentW * 0.35, contentW * 0.17, contentW * 0.12];
    tableRow([
      { value: "PROTOCOLO", width: widths[0] }, { value: "NATUREZA", width: widths[1] },
      { value: "LOCAL", width: widths[2] }, { value: "STATUS", width: widths[3] }, { value: "PRIORIDADE", width: widths[4] },
    ], { header: true, height: 25 });
    data.ocorrencias.forEach((o) => {
      tableRow([
        { value: "#" + o.protocolo, width: widths[0] },
        { value: o.natureza, width: widths[1] },
        { value: address(o), width: widths[2] },
        { value: o.status, width: widths[3] },
        { value: String(o.prioridade ?? "—"), width: widths[4] },
      ]);
      ensure(16);
      const relato = o.relato ? "Relato: " + o.relato : "";
      if (relato) {
        const used = drawTextBlock(relato, M + 9, y - 10, contentW - 18, 7.1, muted, false, 9);
        y -= used + 5;
      }
      if (o.desfecho) {
        const used = drawTextBlock("Desfecho: " + o.desfecho, M + 9, y - 8, contentW - 18, 7.1, ink, false, 9);
        y -= used + 5;
      }
    });
  } else empty("Nenhuma ocorrência vinculada a este plantão.");

  section("Escala operacional", String(data.escalas.length) + " escala(s)");
  if (data.escalas.length) {
    const widths: [number, number, number, number] = [contentW * 0.30, contentW * 0.22, contentW * 0.19, contentW * 0.29];
    tableRow([
      { value: "AGENTES", width: widths[0] }, { value: "FUNÇÃO", width: widths[1] },
      { value: "HORÁRIO", width: widths[2] }, { value: "OBSERVAÇÃO", width: widths[3] },
    ], { header: true, height: 24 });
    data.escalas.forEach((e) => tableRow([
      { value: e.agentes, width: widths[0] }, { value: e.funcao, width: widths[1] },
      { value: (e.hora_inicio || "—") + "–" + (e.hora_fim || "—"), width: widths[2] },
      { value: e.observacao || "—", width: widths[3] },
    ]));
  } else empty("Nenhum registro de escala foi lançado durante o período.");

  section("Postos e conferências");
  if (p.postos?.length) {
    p.postos.forEach((posto, i) => {
      const ok = typeof posto === "object" && posto !== null && "ok" in posto ? posto.ok : false;
      const nomePosto = typeof posto === "string" ? posto : (posto as { nome?: string }).nome || "Posto " + (i + 1);
      const obs = typeof posto === "object" && posto !== null && "obs" in posto ? (posto as { obs?: string }).obs : "";
      ensure(25);
      rect(M, y - 19, contentW, 22, ok ? "#E8F6F0" : pale);
      text(ok ? "✓" : "•", M + 9, y - 11, 9, ok ? green : muted, true);
      text(nomePosto, M + 25, y - 11, 7.8, ink, true);
      text(ok ? "CONFERIDO" : "PENDENTE", W - M - 83, y - 11, 6.4, ok ? green : amber, true);
      y -= 25;
      if (obs) labelValue("Observação", obs, 12);
    });
  } else empty("Nenhum posto ou item de conferência informado.");

  section("Registros operacionais", String(data.registros.length) + " lançamento(s)");
  if (data.registros.length) {
    data.registros.forEach((r) => {
      const who = data.usuarios[r.criado_por] || "Operador";
      const content = wrap(r.texto, contentW - 26, 7.8);
      const h = Math.max(31, content.length * 10 + 20);
      ensure(h);
      rect(M, y - h, contentW, h, pale);
      rect(M, y - h, 2.5, h, cyan);
      text(fmt(r.hora), M + 10, y - 13, 6.8, muted, true);
      text(who, W - M - Math.min(150, who.length * 4.2), y - 13, 6.8, navy2, true);
      const used = drawTextBlock(r.texto, M + 10, y - 26, contentW - 20, 7.8, ink, false, 10);
      y -= Math.max(h, used + 19) + 5;
    });
  } else empty("Nenhum registro operacional lançado.");

  section("Histórico de ações", String(data.acoes.length) + " evento(s)");
  if (data.acoes.length) {
    data.acoes.forEach((a) => {
      const who = data.usuarios[a.usuario_id] || "Operador";
      const lineText = fmt(a.created_at) + "  •  " + who + (a.protocolo ? "  •  Protocolo #" + a.protocolo : "");
      const descLines = wrap(a.descricao, contentW - 18, 7.5);
      const h = Math.max(32, descLines.length * 9.5 + 20);
      ensure(h);
      text(lineText, M + 5, y - 11, 6.7, muted, true);
      drawTextBlock(a.descricao, M + 5, y - 24, contentW - 10, 7.5, ink, false, 9.5);
      rule(M, y - h, W - M, y - h, line, 0.6);
      y -= h;
    });
  } else empty("Nenhuma ação foi registrada no histórico deste plantão.");

  section("Informações complementares");
  const notes = [
    ["Atividades", p.atividades], ["Materiais", p.materiais], ["Informativo", p.informativo],
    ["Atividades — verso", p.atividades_verso], ["Observações gerais", p.observacoes],
  ];
  notes.forEach(([label, value]) => {
    if (!value) return;
    ensure(30);
    text(label, M + 5, y - 10, 7.2, navy2, true);
    const used = drawTextBlock(value, M + 5, y - 22, contentW - 10, 7.7, ink, false, 10);
    y -= used + 29;
    rule(M, y + 13, W - M, y + 13, line, 0.5);
  });
  if (!notes.some((n) => !!n[1])) empty("Nenhuma informação complementar registrada.");

  ensure(80);
  y -= 10;
  rule(M, y, W - M, y, navy2, 1);
  y -= 23;
  text("RESPONSABILIDADE E CONFERÊNCIA", M, y, 8, navy, true);
  y -= 29;
  const signW = (contentW - 24) / 2;
  rule(M + 4, y, M + signW, y, muted, 0.65);
  rule(M + signW + 24, y, W - M - 4, y, muted, 0.65);
  text("Operador responsável", M + 4, y - 13, 7, muted, false);
  text("Supervisor do turno", M + signW + 24, y - 13, 7, muted, false);
  text("Documento gerado pelo CAD Guarda Civil Municipal.", M, 31, 6.8, muted, false);

  if (cmds.length) pages.push(cmds);

  const objects: string[] = [];
  const addObject = (body: string) => { objects.push(body); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];
  pages.forEach((commands, index) => {
    const stream: string[] = [];
    commands.forEach((cmd) => {
      if (cmd.kind === "rect") {
        const c = rgb(cmd.color);
        stream.push(c.map((n) => n.toFixed(3)).join(" ") + " rg");
        stream.push(cmd.x.toFixed(2) + " " + cmd.y.toFixed(2) + " " + cmd.w.toFixed(2) + " " + cmd.h.toFixed(2) + " re f");
      } else if (cmd.kind === "line") {
        const c = rgb(cmd.color);
        stream.push(c.map((n) => n.toFixed(3)).join(" ") + " RG");
        stream.push(cmd.width.toFixed(2) + " w");
        stream.push(cmd.x1.toFixed(2) + " " + cmd.y1.toFixed(2) + " m " + cmd.x2.toFixed(2) + " " + cmd.y2.toFixed(2) + " l S");
      } else {
        const c = rgb(cmd.color);
        stream.push(c.map((n) => n.toFixed(3)).join(" ") + " rg");
        stream.push("BT /" + cmd.font + " " + cmd.size.toFixed(2) + " Tf 1 0 0 1 " + cmd.x.toFixed(2) + " " + cmd.y.toFixed(2) + " Tm (" + pdfEscape(winAnsi(cmd.text)) + ") Tj ET");
      }
    });
    const content = stream.join("\n");
    const contentId = addObject("<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream");
    const pageId = addObject("<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 " + W + " " + H + "] /Resources << /Font << /F1 " + regularFontId + " 0 R /F2 " + boldFontId + " 0 R >> >> /Contents " + contentId + " 0 R >>");
    pageIds.push(pageId);
  });
  objects[catalogId - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
  objects[pagesId - 1] = "<< /Type /Pages /Kids [" + pageIds.map((id) => id + " 0 R").join(" ") + "] /Count " + pageIds.length + " >>";
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xref = pdf.length;
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalogId + " 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
}

function winAnsi(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/•/g, "|")
    .replace(/✓/g, "OK")
    .replace(/\u00A0/g, " ");
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Lock, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { FichaPlantao } from "@/components/ficha-plantao";
import { carregarAtividades, fmtDia, type Plantao } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/plantao/$id")({
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
  const params = new URLSearchParams(window.location.search);
  const modoVisualizar = params.get("modo") === "visualizar";
  const pdf = params.get("pdf") === "1";

  if (modoVisualizar && pdf) {
    return <RelatorioPdfPlantao p={p} operadorNome={nome} />;
  }

  const editavel = me.isAdmin || (p.status === "aberto" && p.operador_id === me.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link to="/historico" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" /> Histórico</Link>
          <h1 className="text-gradient text-2xl">Plantão {p.turno} · {fmtDia(p.data_inicio)}</h1>
          <div className="text-xs text-muted-foreground">Operador: {nome} · {p.status === "aberto" ? "em andamento" : "encerrado"}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir relatório</Button>
        </div>
      </div>
      {p.status !== "aberto" && !me.isAdmin && (
        <div className="flex items-center gap-2 rounded border border-warning/50 p-3 text-sm text-warning print:hidden"><Lock className="h-4 w-4" /> Plantão encerrado — somente o administrador pode alterar.</div>
      )}
      {p.status !== "aberto" && me.isAdmin && (
        <div className="rounded border border-primary/30 bg-primary/5 p-3 text-sm print:hidden">Modo administrador: você pode revisar e editar este plantão finalizado. Clique em <strong>Salvar relatório</strong> para registrar as alterações.</div>
      )}
      <FichaPlantao plantao={p} editavel={editavel} operadorNome={nome} />
    </div>
  );
}


function RelatorioPdfPlantao({ p, operadorNome }: { p: Plantao; operadorNome: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["plantao", "pdf", p.id],
    queryFn: () => carregarAtividades(p),
  });

  useEffect(() => {
    if (!data) return;

    const blob = gerarPdfPlantao(p, operadorNome, data);
    const url = URL.createObjectURL(blob);

    // O modo "Visualizar" deve sair da aplicação e entregar o arquivo
    // diretamente ao visualizador nativo de PDF do navegador.
    window.location.replace(url);

    return () => URL.revokeObjectURL(url);
  }, [p, operadorNome, data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-sm font-semibold">Gerando PDF do plantão...</div>
          <div className="mt-1 text-xs text-slate-400">O arquivo será aberto no visualizador PDF do navegador.</div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-lg border border-red-400/30 bg-slate-900 p-6">
          <div className="font-semibold text-red-300">Não foi possível gerar o PDF.</div>
          <div className="mt-2 text-sm text-slate-400">
            {error instanceof Error ? error.message : "Erro ao consolidar os dados do plantão."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-sm text-slate-300">Abrindo o PDF...</div>
    </div>
  );
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
  const marginTop = 52;
  const marginBottom = 46;
    const lineHeight = 13;
  const maxChars = 92;
  const wrapped: string[] = [];

  for (const original of linhas) {
    const line = original || " ";
    if (line.length <= maxChars) {
      wrapped.push(line);
      continue;
    }
    let rest = line;
    while (rest.length > maxChars) {
      let cut = rest.lastIndexOf(" ", maxChars);
      if (cut < 20) cut = maxChars;
      wrapped.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    wrapped.push(rest || " ");
  }

  const linesPerPage = Math.floor((pageHeight - marginTop - marginBottom) / lineHeight);
  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += linesPerPage) pages.push(wrapped.slice(i, i + linesPerPage));

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];

  for (const pageLines of pages.length ? pages : [[" "]] ) {
    const commands = [
      "BT",
      "/F1 9 Tf",
      `${marginLeft} ${pageHeight - marginTop} Td`,
      `${lineHeight} TL`,
      ...pageLines.map((line, index) => {
        const safe = pdfEscape(winAnsi(line));
        return index === 0 ? `(${safe}) Tj` : `T* (${safe}) Tj`;
      }),
      "ET",
    ].join("\n");
    const stream = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
    const contentId = addObject(stream);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

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

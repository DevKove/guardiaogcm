import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Car, Clock3, FileDown, MapPin, Users, ClipboardList, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, fmtProtocolo, type Status } from "@/lib/cad";
import { carregarAtividades, fmtDia, type Plantao, type PlantaoAtividade } from "@/lib/plantao";
import { Button } from "@/components/ui/button";

const hora = (value: string) => new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dataHora = (value: string) => new Date(value).toLocaleString("pt-BR");
const situacaoViatura: Record<string, string> = {
  disponivel: "Disponível", em_deslocamento: "Em deslocamento", no_local: "No local",
  retornando: "Retornando", manutencao: "Manutenção", fora_servico: "Fora de serviço",
};
const statusOcorrencia = (value: string) => STATUS[value as Status]?.label ?? value;
const escapeHtml = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char] ?? char));
const cell = (value: unknown) => escapeHtml(value == null || value === "" ? "—" : value);

export function PlantaoResumoTempoReal({ plantao }: { plantao: Plantao }) {
  const plantaoId = plantao.id;
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

  // A lista principal é independente dos dados complementares, para que falhas na frota
  // ou nas escalas não escondam as ocorrências do plantão.
  const { data: ocorrencias = [], isLoading: ocorrenciasLoading, error: ocorrenciasError } = useQuery({
    queryKey: ["plantao-ocorrencias", plantaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("id, protocolo, natureza, endereco, bairro, status, prioridade, created_at, updated_at, viatura, numero")
        .eq("plantao_id", plantaoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // A relação plantao_id é a fonte de verdade. Não filtrar por timestamp:
      // ocorrências vinculadas ao plantão podem ter sido criadas antes do início
      // ou atualizadas após o encerramento e ainda assim pertencem ao plantão.
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["plantao-live-summary", plantaoId] }); };
    const ch = supabase.channel(`plantao-resumo-${plantaoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantoes", filter: `id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencias", filter: `plantao_id=eq.${plantaoId}` }, () => {
        refresh();
        void qc.invalidateQueries({ queryKey: ["plantao-ocorrencias", plantaoId] });
        void qc.invalidateQueries({ queryKey: ["ocorrencias"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_registros", filter: `plantao_id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_historico", filter: `plantao_id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_itens", filter: `plantao_id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "plantao_item_movimentos", filter: `plantao_id=eq.${plantaoId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencia_historico" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "viaturas" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "escalas" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "postos_fixos" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [plantaoId, qc]);

  const abertas = ocorrencias.filter((o) => o.status === "aberta").length;
  const atendimento = ocorrencias.filter((o) => o.status === "em_atendimento").length;
  const encerradas = ocorrencias.filter((o) => o.status === "encerrada").length;
  const todasViaturas = data?.viaturas ?? [];
  const escalas = data?.escalas ?? [];
  const registros = data?.registros ?? [];
  const acoes = data?.acoes ?? [];

  // Exibe apenas viaturas que tiveram participação operacional neste plantão:
  // vinculadas a ocorrência, a uma escala do turno ou alteradas após seu início.
  const inicioPlantao = new Date(plantao.iniciado_em).getTime();
  const viaturasUsadasEmOcorrencias = new Set(
    ocorrencias.map((o) => (o.viatura ?? "").trim().toLocaleLowerCase("pt-BR")).filter(Boolean),
  );
  const idsViaturasEscaladas = new Set(escalas.map((e) => e.viatura_id).filter(Boolean));
  const viaturas = todasViaturas.filter((v) => {
    const prefixo = v.prefixo.trim().toLocaleLowerCase("pt-BR");
    const usadaEmOcorrencia = viaturasUsadasEmOcorrencias.has(prefixo) ||
      [...viaturasUsadasEmOcorrencias].some((identificacao) => identificacao.includes(prefixo));
    const usadaEmEscala = idsViaturasEscaladas.has(v.id);
    const atualizacao = v.updated_at ? new Date(v.updated_at).getTime() : Number.NaN;
    const fimPlantao = new Date(plantao.encerrado_em ?? new Date().toISOString()).getTime();
    const alteradaDurantePlantao = Number.isFinite(atualizacao) && atualizacao >= inicioPlantao && atualizacao <= fimPlantao;
    return usadaEmOcorrencia || usadaEmEscala || alteradaDurantePlantao;
  });
  // Próprios municipais só aparecem quando foram associados a uma escala do turno.
  const idsPostosEscalados = new Set(escalas.map((e) => e.posto_id).filter(Boolean));
  const postosAtivos = (data?.postosAtivos ?? []).filter((p) => idsPostosEscalados.has(p.id));
  const viaturasAtivas = viaturas.filter((v) => v.ativa).length;

  async function gerarPdf() {
    // PDF do plantão: consultar itens e movimentações diretamente no banco antes de montar o documento.
    const janela = window.open("", "_blank");
    if (!janela) {
      window.alert("O navegador bloqueou a janela do relatório. Permita pop-ups para este site e tente novamente.");
      return;
    }

    try {
    const { data: plantaoPdf, error: plantaoPdfError } = await supabase.from("plantoes").select("*, assinatura_codigo, assinatura_nome, assinatura_em, assinatura_hash, assinatura_metodo").eq("id", plantaoId).single();
    if (plantaoPdfError) throw plantaoPdfError;
    // O PDF consulta os vínculos diretamente no banco no momento da geração.
    // Isso evita que um resumo em cache/atualização atrasada produza um PDF sem os itens.
    const [{ data: itensPdf, error: itensPdfError }, { data: movimentosPdf, error: movimentosPdfError }] = await Promise.all([
      supabase
        .from("plantao_itens")
        .select("id,item_id,status,situacao,retirado_por,retirado_em,entregue_por,entregue_em,conferido_por,conferido_em,itens!inner(id,categoria,nome,identificacao,patrimonio,observacao,ativo)")
        .eq("plantao_id", plantaoId)
        .order("created_at", { ascending: true }),
      supabase
        .from("plantao_item_movimentos")
        .select("id,item_id,retirado_por,retirado_em,entregue_por,entregue_em,itens!inner(nome,identificacao,categoria)")
        .eq("plantao_id", plantaoId)
        .order("retirado_em", { ascending: true }),
    ]);
    if (itensPdfError) throw itensPdfError;
    if (movimentosPdfError) throw movimentosPdfError;

    const usuarios = data?.usuarios ?? {};
    const itensDiretos = (itensPdf ?? []) as any[];
    const movimentosDiretos = (movimentosPdf ?? []) as any[];

    // Complementa os nomes dos responsáveis que não estejam no resumo em memória.
    const idsItens = Array.from(new Set([
      ...itensDiretos.flatMap((item) => [item.retirado_por, item.entregue_por, item.conferido_por].filter(Boolean)),
      ...movimentosDiretos.flatMap((mov) => [mov.retirado_por, mov.entregue_por].filter(Boolean)),
    ]));
    const { data: perfisItens, error: perfisItensError } = idsItens.length
      ? await supabase.from("profiles").select("id,nome").in("id", idsItens)
      : { data: [], error: null };
    if (perfisItensError) throw perfisItensError;
    const usuariosPdf: Record<string, string> = {
      ...usuarios,
      ...Object.fromEntries((perfisItens ?? []).map((p: any) => [p.id, p.nome || p.id.slice(0, 8)])),
    };
    const nomeUsuarioPdf = (id: string | null | undefined) => id ? (usuariosPdf[id] ?? id.slice(0, 8)) : "—";

    const occurrenceRows = ocorrencias.map((o) => `<tr>
      <td>${cell(hora(o.created_at))}</td><td>${cell(fmtProtocolo(o.protocolo, o.created_at))}</td>
      <td>${cell(o.natureza)}</td><td>${cell([o.endereco, o.numero, o.bairro].filter(Boolean).join(", "))}</td>
      <td>${cell(o.prioridade)}</td><td>${cell(o.viatura)}</td><td>${cell(statusOcorrencia(o.status))}</td>
    </tr>`).join("");
    const fleetRows = viaturas.map((v) => `<tr><td>${cell(v.prefixo)}</td><td>${cell(v.tipo + (v.modelo ? " · " + v.modelo : ""))}</td><td>${cell(v.guarnicao)}</td><td>${cell(v.km_atual == null ? "—" : v.km_atual.toLocaleString("pt-BR") + " km")}</td><td>${cell(v.ativa ? (situacaoViatura[v.status] ?? v.status) : "Inativa")}</td></tr>`).join("");
    const scaleRows = escalas.map((e) => `<tr><td>${cell(e.funcao)}</td><td>${cell(e.hora_inicio.slice(0, 5) + "–" + e.hora_fim.slice(0, 5))}</td><td>${cell(e.agentes)}</td><td>${cell(e.observacao)}</td></tr>`).join("");
    const postRows = postosAtivos.map((p) => `<tr><td>${cell(p.nome)}</td><td>${cell(p.tipo)}</td><td>${cell([p.endereco, p.bairro].filter(Boolean).join(" · "))}</td></tr>`).join("");
    const recordRows = registros.map((r) => `<tr><td>${cell(dataHora(r.hora))}</td><td>${cell(r.texto)}</td><td>${cell(usuarios[r.criado_por] ?? (r.criado_por ? r.criado_por.slice(0, 8) : "—"))}</td></tr>`).join("");
    const actionRows = acoes.map((a) => `<tr><td>${cell(dataHora(a.created_at))}</td><td>${cell(a.protocolo ? fmtProtocolo(a.protocolo, a.created_at) : "—")}</td><td>${cell(a.descricao)}</td><td>${cell(usuarios[a.usuario_id] ?? (a.usuario_id ? a.usuario_id.slice(0, 8) : "—"))}</td></tr>`).join("");
    const itemRows = itensDiretos.flatMap((row) => {
      const item = row.itens ?? {};
      const eventos = [
        row.retirado_em ? { data: row.retirado_em, acao: "Retirada", usuario: nomeUsuarioPdf(row.retirado_por), detalhes: "Item retirado para uso no plantão." } : null,
        row.entregue_em ? { data: row.entregue_em, acao: "Devolução", usuario: nomeUsuarioPdf(row.entregue_por), detalhes: "Item devolvido." } : null,
        row.conferido_em ? { data: row.conferido_em, acao: "Conferência", usuario: nomeUsuarioPdf(row.conferido_por), detalhes: row.situacao || "Conferido" } : null,
      ].filter(Boolean) as { data: string; acao: string; usuario: string; detalhes: string }[];
      if (!eventos.length) {
        eventos.push({ data: plantao.iniciado_em, acao: "Vinculado ao plantão", usuario: "—", detalhes: `${row.status ?? "pendente"} · ${row.situacao ?? "OK"}` });
      }
      return eventos.map((evento) => `<tr><td>${cell(dataHora(evento.data))}</td><td>${cell(item.nome)}</td><td>${cell(item.identificacao || "—")}</td><td>${cell(item.patrimonio || "—")}</td><td>${cell(evento.acao)}</td><td>${cell(evento.usuario)}</td><td>${cell(evento.detalhes)}</td></tr>`);
    }).join("");
    const itemMovementRows = movimentosDiretos.map((m) => `<tr><td>${cell(m.itens?.nome ?? "Item")}</td><td>${cell(m.itens?.identificacao || "—")}</td><td>${cell(m.itens?.categoria || "—")}</td><td>${cell(nomeUsuarioPdf(m.retirado_por))}</td><td>${cell(dataHora(m.retirado_em))}</td><td>${cell(m.entregue_por ? nomeUsuarioPdf(m.entregue_por) : "Pendente")}</td><td>${cell(m.entregue_em ? dataHora(m.entregue_em) : "Pendente")}</td></tr>`).join("");
    const generatedAt = new Date().toLocaleString("pt-BR");
    const pdfPlantao = plantaoPdf as Plantao;
    const assinaturaCodigo = pdfPlantao.assinatura_codigo ?? "";

      janela.document.open();
      janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Plantão - ${cell(fmtDia(plantao.data_inicio))}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm 14mm 12mm 12mm; }
        * { box-sizing: border-box; } body { font: 10px Arial, sans-serif; color: #172033; margin: 0; }
        header { border-bottom: 3px solid #17365d; padding-bottom: 12px; margin-bottom: 14px; }
        h1 { margin: 0 0 5px; color: #17365d; font-size: 21px; } h2 { font-size: 13px; margin: 18px 0 7px; color: #17365d; }
        .meta { color: #475569; font-size: 10px; line-height: 1.6; } .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin: 12px 0; }
        .stat { border: 1px solid #cbd5e1; border-radius: 5px; padding: 9px; } .stat b { display:block; font-size: 18px; margin-top: 3px; }
        table { width:100%; border-collapse: collapse; table-layout: auto; } th { background:#eaf0f7; text-align:left; color:#17365d; }
        th,td { border:1px solid #cbd5e1; padding:5px; vertical-align:top; overflow-wrap:anywhere; } tr { break-inside: avoid; }
        .empty { color:#64748b; font-style:italic; } .print-frame { width:100%; border-collapse:collapse; border:0; } .print-frame > thead { display:table-header-group; } .print-frame > thead > tr > th { height:0; padding:0; border:0; background:transparent; font-size:0; line-height:0; } .signature-repeat { display:none; } .signature-side { display:none; } .footer { margin-top:18px; padding-top:8px; border-top:1px solid #cbd5e1; color:#64748b; font-size:9px; }
        @media screen { body { max-width: 1200px; margin: 24px auto; padding: 24px; } .print-button { padding: 10px 16px; margin-bottom: 16px; } }
        @media print { .print-button { display:none !important; } .signature-repeat { display:block !important; position:relative; height:0; width:100%; overflow:visible; } .signature-repeat span { position:absolute; right:-11mm; top:0; width:8mm; min-height:255mm; display:flex; align-items:center; justify-content:center; padding:2mm 1mm; border-left:1px solid #94a3b8; background:#fff; color:#17365d; font-size:7px; font-weight:700; letter-spacing:.45px; line-height:1.1; white-space:nowrap; writing-mode:vertical-rl; transform:rotate(180deg); } .signature-side { display:none !important; } }
      </style></head><body>
      <button class="print-button" onclick="window.print()">Salvar como PDF / Imprimir</button>\n      ${assinaturaCodigo ? `<table class="print-frame" aria-hidden="true"><thead><tr><th><div class="signature-repeat"><span>ASSINATURA DIGITAL · ${cell(assinaturaCodigo)}</span></div></th></tr></thead><tbody><tr><td style="padding:0;border:0;">` : ""}
      <header><h1>GUARDA CIVIL MUNICIPAL · CAD</h1><div style="font-size:15px;font-weight:bold">Relatório operacional de plantão</div>
      <div class="meta">Turno: ${cell(plantao.turno)} · Data: ${cell(fmtDia(plantao.data_inicio))} · Horário previsto: ${cell(plantao.horario)}<br>
      Início: ${cell(dataHora(plantao.iniciado_em))} · Situação: ${cell(plantao.status === "aberto" ? "Em andamento" : "Encerrado")} · Emitido em: ${cell(generatedAt)}</div></header>
      <div class="stats"><div class="stat">Total de ocorrências<b>${ocorrencias.length}</b></div><div class="stat">Abertas<b>${abertas}</b></div><div class="stat">Em atendimento<b>${atendimento}</b></div><div class="stat">Viaturas ativas<b>${viaturasAtivas}</b></div></div>
      <h2>1. Ocorrências do plantão</h2><table><thead><tr><th>Hora</th><th>Protocolo</th><th>Natureza</th><th>Local</th><th>Prioridade</th><th>Viatura</th><th>Status</th></tr></thead><tbody>${occurrenceRows || '<tr><td colspan="7" class="empty">Nenhuma ocorrência vinculada a este plantão.</td></tr>'}</tbody></table>
      <h2>2. Viaturas utilizadas ou alteradas neste plantão</h2><table><thead><tr><th>Prefixo</th><th>Tipo / modelo</th><th>Guarnição</th><th>Odômetro</th><th>Situação</th></tr></thead><tbody>${fleetRows || '<tr><td colspan="5" class="empty">Nenhuma viatura utilizada ou alterada neste plantão.</td></tr>'}</tbody></table>
      <h2>3. Equipes e escalas do turno</h2><table><thead><tr><th>Função</th><th>Horário</th><th>Equipe / agentes</th><th>Observação</th></tr></thead><tbody>${scaleRows || '<tr><td colspan="4" class="empty">Nenhuma escala cadastrada ou dados indisponíveis.</td></tr>'}</tbody></table>
      <h2>4. Próprios municipais ativos</h2><table><thead><tr><th>Local</th><th>Tipo</th><th>Endereço</th></tr></thead><tbody>${postRows || '<tr><td colspan="3" class="empty">Nenhum próprio municipal ativo cadastrado.</td></tr>'}</tbody></table>
      <h2>5. Lançamentos do plantão</h2><table><thead><tr><th>Data / hora</th><th>Registro</th><th>Responsável</th></tr></thead><tbody>${recordRows || '<tr><td colspan="3" class="empty">Nenhum lançamento registrado.</td></tr>'}</tbody></table>
      <h2>6. Histórico de ações das ocorrências</h2><table><thead><tr><th>Data / hora</th><th>Protocolo</th><th>Ação registrada</th><th>Usuário</th></tr></thead><tbody>${actionRows || '<tr><td colspan="4" class="empty">Nenhuma ação registrada ou dados indisponíveis.</td></tr>'}</tbody></table>
      <h2>7. Itens do plantão e atualizações</h2><table><thead><tr><th>Data / hora</th><th>Item</th><th>Identificação</th><th>Patrimônio</th><th>Alteração</th><th>Usuário responsável</th><th>Detalhes</th></tr></thead><tbody>${itemRows || '<tr><td colspan="7" class="empty">Nenhum item vinculado ou nenhuma atualização registrada neste plantão.</td></tr>'}</tbody></table>
      <h2>8. Histórico de retiradas e devoluções</h2><table><thead><tr><th>Item</th><th>Identificação</th><th>Categoria</th><th>Retirada por</th><th>Retirada</th><th>Devolução por</th><th>Devolução</th></tr></thead><tbody>${itemMovementRows || '<tr><td colspan="7" class="empty">Nenhuma retirada ou devolução de item registrada neste plantão.</td></tr>'}</tbody></table>
      <h2>9. Assinatura digital interna</h2><div style="border:1px solid #cbd5e1;border-radius:5px;padding:10px;">${pdfPlantao.assinatura_em ? `<strong>Documento assinado digitalmente no CAD</strong><br>Assinante: ${cell(pdfPlantao.assinatura_nome)} · Data/hora: ${cell(dataHora(pdfPlantao.assinatura_em))}<br>Método: ${cell(pdfPlantao.assinatura_metodo || "senha")}<br>Código único: <strong>${cell(pdfPlantao.assinatura_codigo || "—")}</strong><br>Hash de integridade SHA-256: <span style="font-family:monospace;word-break:break-all">${cell(pdfPlantao.assinatura_hash)}</span>` : '<span class="empty">Este documento ainda não possui assinatura digital interna.</span>'}</div>
<div class="footer">Documento gerado pelo sistema CAD. Conferir os registros antes de arquivar ou compartilhar.</div>
      ${assinaturaCodigo ? `</td></tr></tbody></table>` : ""}
      <script>window.addEventListener("load", () => setTimeout(() => window.print(), 300));</script>
      </body></html>`);
      janela.document.close();
      janela.focus();
    } catch (e) {
      try {
        janela.document.open();
        janela.document.write(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Erro ao gerar relatório</title><body style="font:16px Arial;padding:24px;color:#172033"><h1>Não foi possível gerar o relatório</h1><p>${cell(e instanceof Error ? e.message : "Erro inesperado")}</p><p>Feche esta janela e tente novamente.</p></body></html>`);
        janela.document.close();
      } catch {
        window.alert("Não foi possível montar o relatório. Atualize a página e tente novamente.");
      }
    }
  }

  return (
    <div className="space-y-5">
      <section className="card-3d animate-rise overflow-hidden border-primary/20">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-r from-primary/10 via-transparent to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-success"><span className="live-dot h-2 w-2 rounded-full bg-success" /> Atualização em tempo real</div>
            <h2 className="mt-2 text-xl font-bold">Resumo operacional</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plantao.turno} · {fmtDia(plantao.data_inicio)} · Iniciado às {hora(plantao.iniciado_em)}</p>
          </div>
          <Button onClick={gerarPdf} variant="default" className="shrink-0"><FileDown className="h-4 w-4" /> Gerar PDF do plantão</Button>
        </div>
        <div className="p-4 sm:p-5">
          {isLoading && <p className="mb-3 text-xs text-muted-foreground">Carregando dados complementares do plantão...</p>}
          {error && <p className="mb-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-warning">Alguns dados complementares não puderam ser carregados: {error.message}. As ocorrências continuam sendo atualizadas separadamente.</p>}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "Ocorrências", value: ocorrencias.length, icon: Activity, note: "Registradas no turno", tone: "text-primary" },
              { label: "Abertas", value: abertas, icon: Clock3, note: "Aguardando atendimento", tone: "text-warning" },
              { label: "Em atendimento", value: atendimento, icon: Activity, note: "Em andamento", tone: "text-info" },
              { label: "Viaturas ativas", value: viaturasAtivas, icon: Car, note: "Na base operacional", tone: "text-success" },
            ].map((k) => <div key={k.label} className="group rounded-xl border bg-card/70 p-4 transition-colors hover:border-primary/40 hover:bg-accent/30">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{k.label}</span><k.icon className={`h-4 w-4 ${k.tone}`} /></div>
              <div className={`mt-2 font-mono text-3xl font-bold tracking-tight ${k.tone}`}>{k.value}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{k.note}</div>
            </div>)}
          </div>
        </div>
      </section>

      <section className="card-3d overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5">
          <div><h3 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-primary" /> Ocorrências deste plantão</h3><p className="mt-1 text-xs text-muted-foreground">Atualização automática · mais recentes primeiro</p></div>
          <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold">{ocorrencias.length} registro(s)</span>
        </div>
        {ocorrenciasError && <p className="m-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">Erro ao carregar ocorrências: {ocorrenciasError.message}</p>}
        {ocorrenciasLoading && <p className="px-4 py-3 text-xs text-muted-foreground">Carregando ocorrências...</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Hora</th><th className="pr-4">Protocolo</th><th className="pr-4">Natureza</th><th className="pr-4">Local</th><th className="pr-4">Prioridade</th><th className="pr-4">Viatura</th><th className="pr-4">Status</th></tr></thead>
            <tbody>{ocorrencias.map((o) => <tr key={o.id} className="border-b last:border-0 transition-colors hover:bg-accent/30"><td className="whitespace-nowrap px-4 py-3 font-mono text-muted-foreground">{hora(o.created_at)}</td><td className="whitespace-nowrap pr-4 font-mono font-semibold">{fmtProtocolo(o.protocolo, o.created_at)}</td><td className="max-w-48 pr-4 font-medium">{o.natureza}</td><td className="min-w-48 pr-4">{o.endereco}{o.numero ? `, ${o.numero}` : ""}{o.bairro ? <span className="text-muted-foreground"> · {o.bairro}</span> : null}</td><td className="pr-4">{o.prioridade}</td><td className="whitespace-nowrap pr-4">{o.viatura || "—"}</td><td className="whitespace-nowrap pr-4"><span className="inline-flex rounded-full border bg-muted/30 px-2 py-1">{statusOcorrencia(o.status)}</span></td></tr>)}</tbody>
          </table>
        </div>
        {!ocorrenciasLoading && !ocorrencias.length && <div className="px-4 py-10 text-center"><Activity className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-2 text-sm font-medium">Nenhuma ocorrência vinculada</p><p className="mt-1 text-xs text-muted-foreground">Os registros vinculados a este plantão aparecerão aqui automaticamente.</p></div>}
        <div className="border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">{encerradas} encerrada(s) · {abertas} aberta(s) · {atendimento} em atendimento</div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card-3d overflow-hidden">
          <div className="flex items-center gap-3 border-b p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Car className="h-4 w-4" /></div><div><h3 className="font-semibold">Situação da frota</h3><p className="text-xs text-muted-foreground">{viaturas.length} viatura(s) cadastrada(s)</p></div></div>
          <div className="space-y-0 p-4">
            {viaturas.map((v) => <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 first:pt-0 last:border-0 last:pb-0"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{v.prefixo}</span><span className="text-xs text-muted-foreground">{v.tipo}{v.modelo ? ` · ${v.modelo}` : ""}</span></div><div className="mt-1 text-xs text-muted-foreground">{v.guarnicao || "Guarnição não informada"}{v.km_atual != null ? ` · ${v.km_atual.toLocaleString("pt-BR")} km` : ""}</div></div><span className={v.ativa ? "rounded-full border border-success/40 bg-success/5 px-2.5 py-1 text-[11px] font-semibold text-success" : "rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground"}>{v.ativa ? (situacaoViatura[v.status] ?? v.status) : "Inativa"}</span></div>)}
            {!viaturas.length && <p className="py-4 text-sm text-muted-foreground">Nenhuma viatura cadastrada ou dados indisponíveis.</p>}
          </div>
        </section>

        <section className="card-3d overflow-hidden">
          <div className="flex items-center gap-3 border-b p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></div><div><h3 className="font-semibold">Equipes e escalas do turno</h3><p className="text-xs text-muted-foreground">{escalas.length} escala(s) cadastrada(s)</p></div></div>
          <div className="space-y-0 p-4">
            {escalas.map((e) => <div key={e.id} className="border-b py-3 first:pt-0 last:border-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-2"><div className="text-sm font-semibold">{e.funcao}</div><span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px]">{e.hora_inicio.slice(0, 5)}–{e.hora_fim.slice(0, 5)}</span></div><div className="mt-2 text-sm">{e.agentes}</div>{e.observacao && <div className="mt-1 text-xs text-muted-foreground">{e.observacao}</div>}</div>)}
            {!escalas.length && <p className="py-4 text-sm text-muted-foreground">Nenhuma escala cadastrada para a data e o turno deste plantão.</p>}
          </div>
        </section>

        <section className="card-3d overflow-hidden xl:col-span-2">
          <div className="flex items-center gap-3 border-b p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><MapPin className="h-4 w-4" /></div><div><h3 className="font-semibold">Próprios municipais ativos</h3><p className="text-xs text-muted-foreground">Locais cadastrados para apoio operacional</p></div><span className="ml-auto rounded-full border px-2.5 py-1 text-xs font-semibold">{postosAtivos.length}</span></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {postosAtivos.map((p) => <div key={p.id} className="rounded-lg border p-3"><div className="font-semibold">{p.nome}</div><div className="mt-1 text-xs text-muted-foreground">{p.tipo}</div><div className="mt-2 text-xs">{[p.endereco, p.bairro].filter(Boolean).join(" · ") || "Endereço não informado"}</div></div>)}
            {!postosAtivos.length && <p className="text-sm text-muted-foreground">Nenhum próprio municipal ativo cadastrado.</p>}
          </div>
        </section>

        <section className="card-3d overflow-hidden xl:col-span-2">
          <div className="flex items-center gap-3 border-b p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><PackageCheck className="h-4 w-4" /></div><div><h3 className="font-semibold">Itens do plantão</h3><p className="text-xs text-muted-foreground">Alterações de retirada, devolução, conferência e situação</p></div><span className="ml-auto rounded-full border px-2.5 py-1 text-xs font-semibold">${data?.itensPlantao.length ?? 0}</span></div>
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[820px] text-xs"><thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-3">Item</th><th className="pr-3">Categoria</th><th className="pr-3">Situação</th><th className="pr-3">Retirada</th><th className="pr-3">Devolução</th><th className="pr-3">Conferência</th></tr></thead>
              <tbody>{(data?.itensPlantao ?? []).map((item) => {
                const usuario = (id: string | null) => id ? ((data?.usuarios ?? {})[id] ?? id.slice(0, 8)) : "—";
                return <tr key={item.id} className="border-b last:border-0 transition-colors hover:bg-accent/30"><td className="px-3 py-3 font-semibold">{item.nome}{item.identificacao ? <span className="ml-2 font-normal text-muted-foreground">#{item.identificacao}</span> : null}{item.patrimonio ? <span className="ml-2 font-normal text-muted-foreground">Patrimônio: {item.patrimonio}</span> : null}</td><td className="pr-3">{item.categoria || "—"}</td><td className="pr-3"><span className="inline-flex rounded-full border bg-muted/30 px-2 py-1">{item.status} · {item.situacao}</span></td><td className="pr-3">{item.retirado_em ? `${dataHora(item.retirado_em)} · ${usuario(item.retirado_por)}` : "—"}</td><td className="pr-3">{item.entregue_em ? `${dataHora(item.entregue_em)} · ${usuario(item.entregue_por)}` : "—"}</td><td className="pr-3">{item.conferido_em ? `${dataHora(item.conferido_em)} · ${usuario(item.conferido_por)}` : "—"}</td></tr>;
              })}</tbody></table>
            {!(data?.itensPlantao ?? []).length && <div className="px-2 py-8 text-center text-sm text-muted-foreground">Nenhum item vinculado a este plantão.</div>}
          </div>
          {!!(data?.movimentacoesItens ?? []).length && <div className="border-t bg-muted/10 p-4"><div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico de movimentações</div><div className="space-y-2">{(data?.movimentacoesItens ?? []).map((m) => <div key={m.id} className="flex flex-col gap-1 rounded-lg border bg-card/60 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"><div><span className="font-semibold">{m.item_nome}</span>{m.item_identificacao ? <span className="ml-2 text-muted-foreground">#{m.item_identificacao}</span> : null}<span className="ml-2 text-muted-foreground">· {m.categoria || "Sem categoria"}</span></div><div className="text-muted-foreground">Retirado: {dataHora(m.retirado_em)} · {(data?.usuarios ?? {})[m.retirado_por] ?? m.retirado_por.slice(0, 8)}{m.entregue_em ? <> · Devolvido: {dataHora(m.entregue_em)} · {(data?.usuarios ?? {})[m.entregue_por ?? ""] ?? "usuário"}</> : <> · Ainda não devolvido</>}</div></div>)}</div></div>}
        </section>

        <section className="card-3d overflow-hidden">
          <div className="flex items-center gap-3 border-b p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Clock3 className="h-4 w-4" /></div><div><h3 className="font-semibold">Histórico de ações</h3><p className="text-xs text-muted-foreground">Movimentações registradas nas ocorrências</p></div></div>
          <div className="space-y-3 p-4">
            {acoes.slice(0, 8).map((a, i) => <div key={`${a.created_at}-${i}`} className="border-b pb-3 last:border-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>{hora(a.created_at)}</span>{a.protocolo ? <span className="font-mono">{fmtProtocolo(a.protocolo, a.created_at)}</span> : null}</div><p className="mt-1 text-sm">{a.descricao}</p><p className="mt-1 text-[11px] text-muted-foreground">{(data?.usuarios ?? {})[a.usuario_id] ?? a.usuario_id.slice(0, 8)}</p></div>)}
            {!acoes.length && <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>}
            {acoes.length > 8 && <p className="text-xs text-muted-foreground">Exibindo as 8 mais recentes. O PDF inclui todo o histórico carregado.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

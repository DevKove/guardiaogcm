import { supabase } from "@/integrations/supabase/client";

export type AlteracaoPlantao = {
  campo: string;
  label: string;
  valor: unknown;
  antes: unknown;
  created_at: string;
  usuario_id: string;
};

export type PlantaoAtividade = {
  ocorrencias: {
    id: string;
    protocolo: number;
    natureza: string;
    endereco: string;
    bairro: string | null;
    status: string;
    prioridade: number;
    created_at: string;
    updated_at: string;
    desfecho: string | null;
    viatura: string | null;
    criado_por: string;
    origem: string;
    numero: string | null;
    solicitante_nome: string | null;
    relato: string;
    despachada_em: string | null;
    chegada_em: string | null;
    encerrada_em: string | null;
  }[];
  viaturas: { id: string; prefixo: string; placa: string | null; modelo: string | null; tipo: string; status: string; guarnicao: string | null; ativa: boolean; km_atual: number | null; observacao: string | null; updated_at: string }[];
  escalas: { id: string; agentes: string; funcao: string; hora_inicio: string; hora_fim: string; observacao: string | null; viatura_id: string | null; posto_id: string | null; criado_por: string; created_at: string; updated_at: string }[];
  postosAtivos: { id: string; nome: string; tipo: string; endereco: string | null; bairro: string | null }[];
  acoes: { descricao: string; created_at: string; protocolo: number | null; usuario_id: string }[];
  registros: { id: string; texto: string; hora: string; criado_por: string }[];
  alteracoes: AlteracaoPlantao[];
  itensPlantao: { id: string; item_id: string; categoria: string; nome: string; identificacao: string | null; patrimonio: string | null; observacao: string | null; ativo: boolean; status: string; situacao: string; retirado_por: string | null; retirado_em: string | null; entregue_por: string | null; entregue_em: string | null; conferido_por: string | null; conferido_em: string | null }[];
  movimentacoesItens: {
    id: string;
    item_id: string;
    item_nome: string;
    item_identificacao: string | null;
    categoria: string;
    retirado_por: string;
    retirado_em: string;
    entregue_por: string | null;
    entregue_em: string | null;
  }[];
  usuarios: Record<string, string>;
};

export type ResumoPlantao = {
  operador: string;
  ocorrencias: {
    id: string;
    protocolo: number;
    natureza: string;
    endereco: string;
    bairro: string | null;
    status: string;
    prioridade: number;
    desfecho: string | null;
  }[];
  acoes: { descricao: string; created_at: string; protocolo: number | null }[];
  registros: { texto: string; hora: string }[];
};

export type Guarnicao = { viatura: string; encarregado: string; condutor: string; aux1: string; aux2: string };
export type PostoCheck = { nome: string; ok: boolean; obs: string };

export type Plantao = {
  id: string;
  operador_id: string;
  data_inicio: string;
  turno: string;
  status: string;
  iniciado_em: string;
  encerrado_em: string | null;
  equipe: string | null;
  supervisor: string | null;
  operador_radio: string | null;
  nome_plantao: "ALPHA" | "BRAVO" | "CHARLIE" | "DELTA" | null;
  supervisor_id: string | null;
  operador_radio_id: string | null;
  horario: string | null;
  guarnicoes: Guarnicao[];
  postos: PostoCheck[];
  atividades: string | null;
  materiais: string | null;
  informativo: string | null;
  atividades_verso: string | null;
  observacoes: string | null;
  resumo?: (PlantaoAtividade & { operador?: string }) | null;
};

type HistoricoRow = {
  descricao: string;
  created_at: string;
  usuario_id: string;
  ocorrencias: { protocolo: number } | null;
};

type PlantaoHistoricoRow = {
  acao: string;
  created_at: string;
  usuario_id: string;
  dados: Record<string, unknown> | null;
};

type ProfileRow = { id: string; nome: string | null };

const CAMPOS_EDITAVEIS: Record<string, string> = {
  nome_plantao: "Nome do plantão",
  supervisor_id: "Supervisor",
  operador_radio_id: "Operador(a) de rádio",
  equipe: "Equipe / efetivo",
  supervisor: "Supervisor",
  operador_radio: "Operador(a) de rádio",
  horario: "Horário",
  guarnicoes: "Guarnições",
  postos: "Postos e conferências",
  atividades: "Atividades — frente",
  materiais: "Materiais de carga",
  informativo: "Informativo do plantão",
  atividades_verso: "Atividades — verso",
  turno: "Turno",
  data_inicio: "Data do plantão",
};

export function turnoAtual(agora = new Date()) {
  const h = agora.getHours();
  const diurno = h >= 6 && h < 18;
  const base = new Date(agora);
  if (!diurno && h < 6) base.setDate(base.getDate() - 1);
  const data = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
  return diurno
    ? { turno: "Diurno", horario: "06:00 às 18:00", data }
    : { turno: "Noturno", horario: "18:00 às 06:00", data };
}

export function fmtDia(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function jsonIguais(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function extrairAlteracoes(rows: PlantaoHistoricoRow[]): AlteracaoPlantao[] {
  const ultimas = new Map<string, AlteracaoPlantao>();

  for (const row of rows) {
    if (row.acao !== "plantao_atualizado" || !row.dados) continue;
    const antes = row.dados.antes && typeof row.dados.antes === "object" ? row.dados.antes as Record<string, unknown> : {};
    const depois = row.dados.depois && typeof row.dados.depois === "object" ? row.dados.depois as Record<string, unknown> : {};

    for (const [campo, label] of Object.entries(CAMPOS_EDITAVEIS)) {
      if (!jsonIguais(antes[campo], depois[campo])) {
        ultimas.set(campo, {
          campo,
          label,
          valor: depois[campo] ?? null,
          antes: antes[campo] ?? null,
          created_at: row.created_at,
          usuario_id: row.usuario_id,
        });
      }
    }
  }

  return Array.from(ultimas.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Junta somente o que foi lançado ou alterado dentro da janela temporal do plantão. */
export async function carregarAtividades(p: {
  id: string;
  operador_id: string;
  iniciado_em: string;
  encerrado_em: string | null;
  data_inicio: string;
  turno: string;
}): Promise<PlantaoAtividade> {
  const fim = p.encerrado_em ?? new Date().toISOString();
  const inicioMs = new Date(p.iniciado_em).getTime();
  const fimMs = new Date(fim).getTime();
  const durantePlantao = (value?: string | null) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= inicioMs && time <= fimMs;
  };

  const [oc, reg, viaturas, escalas, postosAtivos, plantaoHist, itemMov, catalogoItens, plantaoItens] = await Promise.all([
    supabase
      .from("ocorrencias")
      .select("id, protocolo, natureza, endereco, bairro, status, prioridade, created_at, updated_at, desfecho, viatura, criado_por, origem, numero, solicitante_nome, relato, despachada_em, chegada_em, encerrada_em")
      .eq("plantao_id", p.id)
      .order("created_at"),
    supabase
      .from("plantao_registros")
      .select("id, texto, hora, criado_por")
      .eq("plantao_id", p.id)
      .order("hora", { ascending: false }),
    supabase.from("viaturas").select("id, prefixo, placa, modelo, tipo, status, guarnicao, ativa, km_atual, observacao, updated_at").order("prefixo"),
    supabase.from("escalas").select("id, agentes, funcao, hora_inicio, hora_fim, observacao, viatura_id, posto_id, criado_por, created_at, updated_at").eq("data", p.data_inicio).eq("turno", p.turno).order("hora_inicio"),
    supabase.from("postos_fixos").select("id, nome, tipo, endereco, bairro").eq("ativo", true).order("nome"),
    supabase.from("plantao_historico").select("acao, created_at, usuario_id, dados").eq("plantao_id", p.id).gte("created_at", p.iniciado_em).lte("created_at", fim).order("created_at", { ascending: true }),
    supabase.from("plantao_item_movimentos").select("id,item_id,retirado_por,retirado_em,entregue_por,entregue_em,itens!inner(nome,identificacao,categoria)").eq("plantao_id", p.id).order("retirado_em", { ascending: false }),
    supabase.from("itens").select("id,categoria,nome,identificacao,patrimonio,observacao,ativo").eq("ativo", true).order("categoria").order("nome"),
    supabase.from("plantao_itens").select("id,item_id,status,situacao,retirado_por,retirado_em,entregue_por,entregue_em,conferido_por,conferido_em").eq("plantao_id", p.id),
  ]);

  if (oc.error) throw oc.error;
  if (reg.error) throw reg.error;
  if (viaturas.error) throw viaturas.error;
  if (escalas.error) throw escalas.error;
  if (postosAtivos.error) throw postosAtivos.error;
  if (plantaoHist.error) throw plantaoHist.error;
  if (itemMov.error) throw itemMov.error;
  if (catalogoItens.error) throw catalogoItens.error;
  if (plantaoItens.error) throw plantaoItens.error;

  const { data: rawHist, error: histError } = await supabase
    .from("ocorrencia_historico")
    .select("descricao, created_at, usuario_id, ocorrencias!inner(protocolo, plantao_id)")
    .eq("ocorrencias.plantao_id", p.id)
    .gte("created_at", p.iniciado_em)
    .lte("created_at", fim)
    .order("created_at", { ascending: false });

  if (histError) throw histError;

  const ocorrenciasDoPlantao = (oc.data ?? []).filter((x) => durantePlantao(x.created_at) || durantePlantao(x.updated_at));
  const registrosDoPlantao = (reg.data ?? []).filter((x) => durantePlantao(x.hora));
  const escalasDoPlantao = (escalas.data ?? []).filter((x) => durantePlantao(x.created_at) || durantePlantao(x.updated_at));
  const histData = (rawHist ?? []) as unknown as HistoricoRow[];
  const auditoriaData = (plantaoHist.data ?? []) as unknown as PlantaoHistoricoRow[];
  const alteracoes = extrairAlteracoes(auditoriaData);
  const situacaoPorItem = new Map((plantaoItens.data ?? []).map((m: any) => [m.item_id, m]));
  const movimentoMaisRecentePorItem = new Map<string, any>();
  for (const m of itemMov.data ?? []) {
    if (!movimentoMaisRecentePorItem.has(m.item_id)) movimentoMaisRecentePorItem.set(m.item_id, m);
  }
  const itensPlantao = (catalogoItens.data ?? []).map((item: any) => {
    const mov = situacaoPorItem.get(item.id) ?? {};
    const hist = movimentoMaisRecentePorItem.get(item.id) ?? {};
    return { id: item.id, item_id: item.id, categoria: item.categoria, nome: item.nome, identificacao: item.identificacao ?? null, patrimonio: item.patrimonio ?? null, observacao: item.observacao ?? null, ativo: item.ativo, status: mov.status ?? "pendente", situacao: mov.situacao ?? "OK", retirado_por: hist.retirado_por ?? mov.retirado_por ?? null, retirado_em: hist.retirado_em ?? mov.retirado_em ?? null, entregue_por: hist.entregue_por ?? mov.entregue_por ?? null, entregue_em: hist.entregue_em ?? mov.entregue_em ?? null, conferido_por: mov.conferido_por ?? null, conferido_em: mov.conferido_em ?? null };
  });

  const movimentacoesItens = (itemMov.data ?? []).map((m: any) => ({
    id: m.id,
    item_id: m.item_id,
    item_nome: m.itens?.nome ?? "Item",
    item_identificacao: m.itens?.identificacao ?? null,
    categoria: m.itens?.categoria ?? "",
    retirado_por: m.retirado_por,
    retirado_em: m.retirado_em,
    entregue_por: m.entregue_por ?? null,
    entregue_em: m.entregue_em ?? null,
  }));

  const ids = Array.from(
    new Set([
      ...ocorrenciasDoPlantao.map((x) => x.criado_por),
      ...histData.map((x) => x.usuario_id),
      ...registrosDoPlantao.map((x) => x.criado_por),
      ...escalasDoPlantao.map((x) => x.criado_por),
      ...alteracoes.map((x) => x.usuario_id),
      ...movimentacoesItens.map((x) => x.retirado_por),
      ...movimentacoesItens.flatMap((x) => x.entregue_por ? [x.entregue_por] : []),
      p.operador_id,
    ]),
  );

  const { data: profiles, error: profileError } = ids.length
    ? await supabase.from("profiles").select("id, nome").in("id", ids)
    : { data: [] as ProfileRow[], error: null };

  if (profileError) throw profileError;

  const usuarios = Object.fromEntries(
    ((profiles ?? []) as ProfileRow[]).map((x) => [x.id, x.nome || x.id.slice(0, 8)]),
  );

  return {
    ocorrencias: ocorrenciasDoPlantao,
    viaturas: viaturas.data ?? [],
    escalas: escalasDoPlantao,
    postosAtivos: postosAtivos.data ?? [],
    acoes: histData.map((h) => ({
      descricao: h.descricao,
      created_at: h.created_at,
      usuario_id: h.usuario_id,
      protocolo: h.ocorrencias?.protocolo ?? null,
    })),
    registros: registrosDoPlantao,
    alteracoes,
    movimentacoesItens,
    usuarios,
  };
}

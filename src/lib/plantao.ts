import { supabase } from "@/integrations/supabase/client";

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
  escalas: { id: string; agentes: string; funcao: string; hora_inicio: string; hora_fim: string; observacao: string | null; viatura_id: string | null; posto_id: string | null; criado_por: string }[];
  postosAtivos: { id: string; nome: string; tipo: string; endereco: string | null; bairro: string | null }[];
  acoes: { descricao: string; created_at: string; protocolo: number | null; usuario_id: string }[];
  registros: { id: string; texto: string; hora: string; criado_por: string }[];
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
    created_at: string;
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

type ProfileRow = { id: string; nome: string | null };

/** Turno, horário e data de início calculados pelo relógio do sistema. */
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

/** Junta tudo que o operador lançou durante o plantão. */
export async function carregarAtividades(p: {
  id: string;
  operador_id: string;
  iniciado_em: string;
  encerrado_em: string | null;
  data_inicio: string;
  turno: string;
}): Promise<PlantaoAtividade> {
  const fim = p.encerrado_em ?? new Date(Date.now() + 60000).toISOString();

  const [oc, reg, viaturas, escalas, postosAtivos] = await Promise.all([
    supabase
      .from("ocorrencias")
      .select("id, protocolo, natureza, endereco, bairro, status, prioridade, created_at, desfecho, viatura, criado_por, origem, numero, solicitante_nome, relato, despachada_em, chegada_em, encerrada_em")
      .eq("plantao_id", p.id)
      .order("created_at"),
    supabase
      .from("plantao_registros")
      .select("id, texto, hora, criado_por")
      .eq("plantao_id", p.id)
      .order("hora", { ascending: false }),
    supabase.from("viaturas").select("id, prefixo, placa, modelo, tipo, status, guarnicao, ativa, km_atual, observacao, updated_at").order("prefixo"),
    supabase.from("escalas").select("id, agentes, funcao, hora_inicio, hora_fim, observacao, viatura_id, posto_id, criado_por").eq("data", p.data_inicio).eq("turno", p.turno).order("hora_inicio"),
    supabase.from("postos_fixos").select("id, nome, tipo, endereco, bairro").eq("ativo", true).order("nome"),
  ]);

  if (oc.error) throw oc.error;
  if (reg.error) throw reg.error;
  if (viaturas.error) throw viaturas.error;
  if (escalas.error) throw escalas.error;
  if (postosAtivos.error) throw postosAtivos.error;

  const { data: rawHist, error: histError } = await supabase
    .from("ocorrencia_historico")
    .select("descricao, created_at, usuario_id, ocorrencias!inner(protocolo, plantao_id)")
    .eq("ocorrencias.plantao_id", p.id)
    .gte("created_at", p.iniciado_em)
    .lte("created_at", fim)
    .order("created_at", { ascending: false });

  if (histError) throw histError;

  const histData = (rawHist ?? []) as unknown as HistoricoRow[];

  const ids = Array.from(
    new Set([
      ...(oc.data ?? []).map((x) => x.criado_por),
      ...histData.map((x) => x.usuario_id),
      ...(reg.data ?? []).map((x) => x.criado_por),
      ...(escalas.data ?? []).map((x) => x.criado_por),
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
    ocorrencias: oc.data ?? [],
    viaturas: viaturas.data ?? [],
    escalas: escalas.data ?? [],
    postosAtivos: postosAtivos.data ?? [],
    acoes: histData.map((h) => ({
      descricao: h.descricao,
      created_at: h.created_at,
      usuario_id: h.usuario_id,
      protocolo: h.ocorrencias?.protocolo ?? null,
    })),
    registros: reg.data ?? [],
    usuarios,
  };
}

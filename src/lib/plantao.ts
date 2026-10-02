import { supabase } from "@/integrations/supabase/client";

export type PlantaoAtividade = {
  ocorrencias: { id: string; protocolo: number; natureza: string; endereco: string; bairro: string | null; status: string; prioridade: number; created_at: string; desfecho: string | null; viatura: string | null; criado_por: string }[];
  acoes: { descricao: string; created_at: string; protocolo: number | null; usuario_id: string }[];
  registros: { id: string; texto: string; hora: string; criado_por: string }[];
  usuarios: Record<string, string>;
};

export type ResumoPlantao = {
  operador: string;
  ocorrencias: { id: string; protocolo: number; natureza: string; endereco: string; bairro: string | null; status: string; prioridade: number; created_at: string; desfecho: string | null }[];
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
};

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
export async function carregarAtividades(p: { id: string; operador_id: string; iniciado_em: string; encerrado_em: string | null }) {
  const fim = p.encerrado_em ?? new Date(Date.now() + 60000).toISOString();
  const [oc, hist, reg] = await Promise.all([
    supabase.from("ocorrencias").select("id, protocolo, natureza, endereco, bairro, status, prioridade, created_at, desfecho, viatura, criado_por").eq("plantao_id", p.id).order("created_at"),
    supabase.from("ocorrencia_historico").select("descricao, created_at, usuario_id, ocorrencias(protocolo)").eq("ocorrencia_id", "00000000-0000-0000-0000-000000000000").limit(0),
    supabase.from("plantao_registros").select("id, texto, hora, criado_por").eq("plantao_id", p.id).order("hora", { ascending: false }),
  ]);

  const { data: histData } = await supabase
    .from("ocorrencia_historico")
    .select("descricao, created_at, usuario_id, ocorrencias!inner(protocolo, plantao_id)")
    .eq("ocorrencias.plantao_id", p.id)
    .gte("created_at", p.iniciado_em)
    .lte("created_at", fim)
    .order("created_at", { ascending: false });

  const ids = Array.from(new Set([
    ...(oc.data ?? []).map((x) => x.criado_por),
    ...(histData ?? []).map((x) => x.usuario_id),
    ...(reg.data ?? []).map((x) => x.criado_por),
    p.operador_id,
  ]));
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, nome").in("id", ids) : { data: [] as { id: string; nome: string }[] };
  const usuarios = Object.fromEntries((profiles ?? []).map((x) => [x.id, x.nome || x.id.slice(0, 8)]));

  return {
    ocorrencias: oc.data ?? [],
    acoes: (histData ?? []).map((h) => ({ descricao: h.descricao, created_at: h.created_at, usuario_id: h.usuario_id, protocolo: (h.ocorrencias as { protocolo: number } | null)?.protocolo ?? null })),
    registros: reg.data ?? [],
    usuarios,
  };
}

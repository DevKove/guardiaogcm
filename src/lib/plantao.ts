import { supabase } from "@/integrations/supabase/client";

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
    supabase.from("ocorrencias").select("id, protocolo, natureza, endereco, bairro, status, prioridade, created_at, desfecho, viatura").eq("plantao_id", p.id).order("created_at"),
    supabase.from("ocorrencia_historico").select("descricao, created_at, ocorrencias(protocolo)").eq("usuario_id", p.operador_id).gte("created_at", p.iniciado_em).lte("created_at", fim).order("created_at", { ascending: false }),
    supabase.from("plantao_registros").select("id, texto, hora").eq("plantao_id", p.id).order("hora", { ascending: false }),
  ]);
  return {
    ocorrencias: oc.data ?? [],
    acoes: (hist.data ?? []).map((h) => ({ descricao: h.descricao, created_at: h.created_at, protocolo: (h.ocorrencias as { protocolo: number } | null)?.protocolo ?? null })),
    registros: reg.data ?? [],
  };
}

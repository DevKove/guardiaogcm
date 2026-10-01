import { supabase } from "@/integrations/supabase/client";

export type ResumoPlantao = {
  operador: string;
  ocorrencias: { id: string; protocolo: number; natureza: string; endereco: string; bairro: string | null; status: string; prioridade: number; created_at: string; desfecho: string | null }[];
  acoes: { descricao: string; created_at: string; protocolo: number | null }[];
  registros: { texto: string; hora: string }[];
};

/** Junta tudo que o operador lançou durante o plantão. */
export async function carregarAtividades(p: { id: string; operador_id: string; iniciado_em: string; encerrado_em: string | null }) {
  const fim = p.encerrado_em ?? new Date(Date.now() + 60000).toISOString();
  const [oc, hist, reg] = await Promise.all([
    supabase.from("ocorrencias").select("id, protocolo, natureza, endereco, bairro, status, prioridade, created_at, desfecho").eq("plantao_id", p.id).order("created_at"),
    supabase.from("ocorrencia_historico").select("descricao, created_at, ocorrencias(protocolo)").eq("usuario_id", p.operador_id).gte("created_at", p.iniciado_em).lte("created_at", fim).order("created_at", { ascending: false }),
    supabase.from("plantao_registros").select("id, texto, hora").eq("plantao_id", p.id).order("hora", { ascending: false }),
  ]);
  return {
    ocorrencias: oc.data ?? [],
    acoes: (hist.data ?? []).map((h) => ({ descricao: h.descricao, created_at: h.created_at, protocolo: (h.ocorrencias as { protocolo: number } | null)?.protocolo ?? null })),
    registros: reg.data ?? [],
  };
}

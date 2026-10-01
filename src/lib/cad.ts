export const NATUREZAS = [
  "Perturbação do sossego",
  "Vias de fato / Agressão",
  "Furto",
  "Roubo",
  "Dano ao patrimônio público",
  "Apoio a outros órgãos",
  "Trânsito / Acidente",
  "Violência doméstica (Maria da Penha)",
  "Pessoa em situação de rua",
  "Comércio ambulante irregular",
  "Ocorrência ambiental",
  "Averiguação de suspeito",
  "Ronda escolar",
  "Pessoa desaparecida",
  "Outros",
] as const;

export const ORIGENS = ["153", "Rádio", "Presencial", "Videomonitoramento", "Iniciativa da guarnição", "Outro órgão"] as const;

export const TIPOS_ENVOLVIDO = ["Vítima", "Autor", "Suspeito", "Testemunha", "Solicitante", "Condutor"] as const;

export const DESFECHOS = [
  "Atendida - resolvida no local",
  "Atendida - encaminhada à Delegacia",
  "Atendida - orientação",
  "Atendida - apoio prestado",
  "Nada constatado",
  "Solicitante não localizado",
  "Endereço não localizado",
  "Trote",
] as const;

export const PRIORIDADES: Record<number, { label: string; cls: string }> = {
  1: { label: "P1 · Emergência", cls: "bg-destructive text-destructive-foreground" },
  2: { label: "P2 · Urgente", cls: "bg-warning text-primary-foreground" },
  3: { label: "P3 · Normal", cls: "bg-info text-primary-foreground" },
  4: { label: "P4 · Baixa", cls: "bg-muted text-muted-foreground" },
};

export type Status = "aberta" | "em_atendimento" | "encerrada" | "cancelada";

export const STATUS: Record<Status, { label: string; cls: string }> = {
  aberta: { label: "Aberta", cls: "border-warning text-warning" },
  em_atendimento: { label: "Em atendimento", cls: "border-info text-info" },
  encerrada: { label: "Encerrada", cls: "border-success text-success" },
  cancelada: { label: "Cancelada", cls: "border-muted-foreground text-muted-foreground" },
};

export type VStatus = "disponivel" | "em_deslocamento" | "no_local" | "retornando" | "manutencao" | "fora_servico";

export const VSTATUS: Record<VStatus, { label: string; cls: string; dot: string }> = {
  disponivel: { label: "Disponível", cls: "border-success text-success", dot: "bg-success" },
  em_deslocamento: { label: "Em deslocamento", cls: "border-warning text-warning", dot: "bg-warning" },
  no_local: { label: "No local", cls: "border-info text-info", dot: "bg-info" },
  retornando: { label: "Retornando", cls: "border-info text-info", dot: "bg-info" },
  manutencao: { label: "Manutenção", cls: "border-destructive text-destructive", dot: "bg-destructive" },
  fora_servico: { label: "Fora de serviço", cls: "border-muted-foreground text-muted-foreground", dot: "bg-muted-foreground" },
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
};

export const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

export function fmtProtocolo(n: number, d: string) {
  return `${new Date(d).getFullYear()}-${String(n).padStart(6, "0")}`;
}

export function fmtData(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function minutosEntre(a: string | null, b: string | null) {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

export const TIPOS_POSTO = ["Escola", "Unidade de Saúde", "UPA / Hospital", "Prédio público", "Praça / Parque", "Terminal", "Cemitério", "Outro"] as const;
export const TURNOS = ["Diurno", "Noturno", "Manhã", "Tarde", "Madrugada", "Extra"] as const;
export const FUNCOES_ESCALA = ["Patrulhamento", "Posto fixo", "Ronda escolar", "Central / Despacho", "Supervisão", "Apoio", "Videomonitoramento"] as const;
export const TIPOS_VIATURA = ["Viatura", "Motocicleta", "Tático", "Base móvel", "Bicicleta"] as const;

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
  "Outros",
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

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
};

export function fmtProtocolo(n: number, d: string) {
  return `${new Date(d).getFullYear()}-${String(n).padStart(6, "0")}`;
}

export function fmtData(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

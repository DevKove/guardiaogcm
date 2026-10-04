import { createFileRoute, redirect } from "@tanstack/react-router";

// Compatibilidade com favoritos e links antigos: o módulo Escalas foi incorporado a Postos fixos.
export const Route = createFileRoute("/_authenticated/escalas")({
  beforeLoad: () => {
    throw redirect({ to: "/postos" });
  },
});

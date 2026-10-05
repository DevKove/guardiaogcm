import { createFileRoute } from "@tanstack/react-router";
import { ItensPlantao } from "@/components/itens-plantao";

export const Route = createFileRoute("/_authenticated/itens-armas")({
  head: () => ({ meta: [{ title: "Armas · Itens · CAD" }] }),
  component: () => <ItensPlantao categoria="arma" />,
});

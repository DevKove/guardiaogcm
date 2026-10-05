import { createFileRoute } from "@tanstack/react-router";
import { ItensPlantao } from "@/components/itens-plantao";

export const Route = createFileRoute("/_authenticated/itens-cad")({
  head: () => ({ meta: [{ title: "Itens CAD · Itens · CAD" }] }),
  component: () => <ItensPlantao categoria="cad" />,
});

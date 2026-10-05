import { createFileRoute } from "@tanstack/react-router";
import { ItensPlantao } from "@/components/itens-plantao";

export const Route = createFileRoute("/_authenticated/itens-radios")({
  head: () => ({ meta: [{ title: "Rádios · Itens · CAD" }] }),
  component: () => <ItensPlantao categoria="radio" />,
});

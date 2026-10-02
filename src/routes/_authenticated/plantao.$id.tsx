import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { FichaPlantao } from "@/components/ficha-plantao";
import { fmtDia, type Plantao } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/plantao/$id")({
  head: () => ({ meta: [{ title: "Relatório de plantão · CAD" }] }),
  component: VerPlantao,
});

function VerPlantao() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: ["plantao", id],
    queryFn: async () => {
      const { data } = await supabase.from("plantoes").select("*").eq("id", id).single();
      const { data: prof } = await supabase.from("profiles").select("nome").eq("id", data!.operador_id).maybeSingle();
      return { p: data as unknown as Plantao, nome: prof?.nome ?? "" };
    },
  });
  if (!data || !me) return <div className="text-muted-foreground">Carregando...</div>;
  const { p, nome } = data;
  const editavel = me.isAdmin || (p.status === "aberto" && p.operador_id === me.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link to="/historico" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" /> Histórico</Link>
          <h1 className="text-gradient text-2xl">Plantão {p.turno} · {fmtDia(p.data_inicio)}</h1>
          <div className="text-xs text-muted-foreground">Operador: {nome} · {p.status === "aberto" ? "em andamento" : "encerrado"}</div>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button>
      </div>
      {p.status !== "aberto" && !me.isAdmin && (
        <div className="flex items-center gap-2 rounded border border-warning/50 p-3 text-sm text-warning print:hidden"><Lock className="h-4 w-4" /> Plantão encerrado — somente o administrador pode alterar.</div>
      )}
      <FichaPlantao plantao={p} editavel={editavel} operadorNome={nome} />
    </div>
  );
}

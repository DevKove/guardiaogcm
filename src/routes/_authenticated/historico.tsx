import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { History, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { fmtDia } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico de plantões · CAD" }] }),
  component: Historico,
});

const ordemTurno = (t: string) => (t === "Diurno" ? 0 : t === "Noturno" ? 1 : 2);

function Historico() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const { data = [], isLoading } = useQuery({
    queryKey: ["plantao", "historico", mes],
    queryFn: async () => {
      const [y, m] = mes.split("-").map(Number);
      const fim = new Date(y, m, 0).getDate();
      const { data } = await supabase.from("plantoes").select("id, data_inicio, turno, horario, equipe, supervisor, status, operador_id, iniciado_em, encerrado_em, resumo")
        .gte("data_inicio", `${mes}-01`).lte("data_inicio", `${mes}-${fim}`).order("data_inicio", { ascending: false });
      const ids = [...new Set((data ?? []).map((p) => p.operador_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, nome").in("id", ids) : { data: [] };
      const pm = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      return (data ?? []).map((p) => ({ ...p, operador: pm.get(p.operador_id) ?? "" }));
    },
  });

  const dias = [...new Set(data.map((p) => p.data_inicio))];

  return (
    <div className="space-y-6">
      <PageHeader icon={History} kicker="ARQUIVO" title="Histórico de plantões">
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
      </PageHeader>
      {isLoading && <div className="text-muted-foreground">Carregando...</div>}
      {!isLoading && !dias.length && <div className="card-3d p-6 text-center text-muted-foreground">Nenhum plantão neste mês.</div>}
      {dias.map((d) => (
        <div key={d} className="card-3d animate-rise p-4">
          <div className="mb-2 font-mono text-sm font-bold text-primary">{fmtDia(d)}</div>
          <div className="grid gap-2 md:grid-cols-2">
            {data.filter((p) => p.data_inicio === d).sort((a, b) => ordemTurno(a.turno) - ordemTurno(b.turno)).map((p) => {
              const n = (p.resumo as { ocorrencias?: unknown[] } | null)?.ocorrencias?.length;
              return (
                <Link key={p.id} to="/plantao/$id" params={{ id: p.id }} className="lift flex items-center gap-3 rounded-lg border p-3 hover:border-primary">
                  {p.turno === "Noturno" ? <Moon className="h-5 w-5 text-info" /> : <Sun className="h-5 w-5 text-warning" />}
                  <div className="flex-1">
                    <div className="font-semibold">{p.turno} <span className="text-xs text-muted-foreground">{p.horario}</span></div>
                    <div className="text-xs text-muted-foreground">Operador: {p.operador}{p.equipe ? ` · Equipe ${p.equipe}` : ""}{p.supervisor ? ` · Sup. ${p.supervisor}` : ""}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className={p.status === "aberto" ? "text-success" : "text-muted-foreground"}>{p.status === "aberto" ? "Em andamento" : "Encerrado"}</div>
                    {n !== undefined && <div className="font-mono">{n} ocorr.</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

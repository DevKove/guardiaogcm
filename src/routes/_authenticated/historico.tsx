import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useMe } from "@/hooks/use-me";
import { History, Moon, Sun, FileText, Pencil, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { fmtDia } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico de plantões · CAD" }] }),
  component: Historico,
});

const ordemTurno = (t: string) => (t === "Diurno" ? 0 : t === "Noturno" ? 1 : 2);
const mesLocalAtual = () => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
};

function Historico() {
  const [mes, setMes] = useState(mesLocalAtual);
  const { data: me, isLoading: carregandoPerfil } = useMe();
  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plantao", "historico", mes],
    queryFn: async () => {
      let query = supabase.from("plantoes")
        .select("id, data_inicio, turno, horario, equipe, supervisor, status, operador_id, iniciado_em, encerrado_em, resumo")
        .eq("status", "encerrado")
        .order("data_inicio", { ascending: false })
        .order("iniciado_em", { ascending: false });
      if (mes) {
        const [y, m] = mes.split("-").map(Number);
        const fim = new Date(y ?? 2026, m ?? 1, 0).getDate();
        query = query.gte("data_inicio", `${mes}-01`).lte("data_inicio", `${mes}-${String(fim).padStart(2, "0")}`);
      }
      const { data: plantoes, error: plantaoError } = await query;
      if (plantaoError) throw plantaoError;
      const ids = [...new Set((plantoes ?? []).map((p) => p.operador_id).filter(Boolean))];
      const { data: profs, error: profileError } = ids.length
        ? await supabase.from("profiles").select("id, nome").in("id", ids)
        : { data: [], error: null };
      if (profileError) throw profileError;
      const pm = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      return (plantoes ?? []).map((p) => ({ ...p, operador: pm.get(p.operador_id) ?? "" }));
    },
  });

  const dias = [...new Set(data.map((p) => p.data_inicio))];

  return (
    <div className="space-y-6">
      <PageHeader icon={History} kicker="ARQUIVO" title="Histórico de plantões">
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="Filtrar histórico por mês (vazio mostra todos)" type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
          <Button variant="outline" onClick={() => setMes("")} disabled={!mes}>Todos os meses</Button>
          <Button variant="outline" size="icon" onClick={() => void refetch()} aria-label="Atualizar histórico"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </PageHeader>
      {!carregandoPerfil && !me && <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Não foi possível identificar o usuário autenticado. Saia e entre novamente no CAD.</div>}
      {isLoading && <div className="text-muted-foreground">Carregando plantões finalizados...</div>}
      {isError && <div className="space-y-2 rounded-lg border border-destructive/40 p-4"><div className="font-semibold text-destructive">Não foi possível carregar o histórico.</div><div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Erro de acesso ao banco de dados."}</div><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div>}
      {!isLoading && !isError && !dias.length && <div className="card-3d p-6 text-center text-muted-foreground">Nenhum plantão finalizado {mes ? "neste mês" : "encontrado no histórico"}. Confira o filtro de mês ou selecione “Todos os meses”.</div>}
      {dias.map((d) => (
        <div key={d} className="card-3d animate-rise p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="font-mono text-sm font-bold text-primary">{fmtDia(d)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Plantões finalizados</div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data.filter((p) => p.data_inicio === d).sort((a, b) => ordemTurno(a.turno) - ordemTurno(b.turno)).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary">
                {p.turno === "Noturno" ? <Moon className="h-5 w-5 shrink-0 text-info" /> : <Sun className="h-5 w-5 shrink-0 text-warning" />}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.turno} <span className="text-xs text-muted-foreground">{p.horario}</span></div>
                  <div className="text-xs text-muted-foreground">Operador: {p.operador}{p.equipe ? ` · Equipe ${p.equipe}` : ""}{p.supervisor ? ` · Sup. ${p.supervisor}` : ""}</div>
                  <div className="mt-1 text-xs text-success">Finalizado</div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button asChild size="sm" variant="outline"><a href={`/guardiaogcm/plantao?historico=${encodeURIComponent(p.id)}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><FileText className="h-4 w-4" /> Visualizar</a></Button>
                  {me?.isAdmin && <Button asChild size="sm"><a href={`/guardiaogcm/plantao?historico=${encodeURIComponent(p.id)}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Pencil className="h-4 w-4" /> Editar</a></Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

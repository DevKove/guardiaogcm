import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS, fmtData, fmtProtocolo, minutosEntre, type Status } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · CAD" }] }),
  component: Relatorios,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", color: "var(--foreground)" } };

function contar<T>(arr: T[], key: (x: T) => string | null | undefined) {
  const m = new Map<string, number>();
  arr.forEach((x) => {
    const k = key(x) || "Não informado";
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return [...m.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
}

function Relatorios() {
  const [de, setDe] = useState(iso(new Date(Date.now() - 30 * 864e5)));
  const [ate, setAte] = useState(iso(new Date()));

  const { data = [], isLoading } = useQuery({
    queryKey: ["relatorio", de, ate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("*")
        .gte("created_at", de + "T00:00:00")
        .lte("created_at", ate + "T23:59:59")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const s = useMemo(() => {
    const resp = data.map((o) => minutosEntre(o.created_at, o.chegada_em)).filter((x): x is number => x !== null);
    const porDia = contar(data, (o) => new Date(o.created_at).toLocaleDateString("pt-BR")).sort((a, b) =>
      a.nome.split("/").reverse().join().localeCompare(b.nome.split("/").reverse().join()),
    );
    const porHora = Array.from({ length: 24 }, (_, h) => ({
      nome: String(h).padStart(2, "0") + "h",
      total: data.filter((o) => new Date(o.created_at).getHours() === h).length,
    }));
    return {
      natureza: contar(data, (o) => o.natureza).slice(0, 10),
      bairro: contar(data, (o) => o.bairro).slice(0, 10),
      status: contar(data, (o) => STATUS[o.status as Status].label),
      origem: contar(data, (o) => o.origem),
      porDia,
      porHora,
      tempoMedio: resp.length ? Math.round(resp.reduce((a, b) => a + b, 0) / resp.length) : null,
    };
  }, [data]);

  function exportar() {
    const cols = ["Protocolo", "Abertura", "Natureza", "Prioridade", "Status", "Origem", "Endereço", "Bairro", "Viatura", "Despacho", "Chegada", "Encerramento", "Desfecho"];
    const rows = data.map((o) => [
      fmtProtocolo(o.protocolo, o.created_at), fmtData(o.created_at), o.natureza, o.prioridade, STATUS[o.status as Status].label,
      o.origem, `${o.endereco}${o.numero ? ", " + o.numero : ""}`, o.bairro ?? "", o.viatura ?? "",
      fmtData(o.despachada_em), fmtData(o.chegada_em), fmtData(o.encerrada_em), o.desfecho ?? "",
    ]);
    const csv = [cols, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocorrencias_${de}_${ate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { l: "Total no período", v: data.length },
    { l: "Encerradas", v: data.filter((o) => o.status === "encerrada").length },
    { l: "Em aberto", v: data.filter((o) => o.status === "aberta" || o.status === "em_atendimento").length },
    { l: "Tempo médio de chegada", v: s.tempoMedio !== null ? `${s.tempoMedio} min` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs tracking-widest text-muted-foreground">ESTATÍSTICA</div>
          <div className="flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}cad-assets/capacidade-analitica.gif`} alt="" aria-hidden="true" className="h-10 w-10 shrink-0 object-contain" /><h1 className="text-2xl font-bold">Relatórios</h1></div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          <Button variant="secondary" onClick={exportar} disabled={!data.length}>Exportar CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className="card-3d animate-rise p-4">
            <div className="text-xs text-muted-foreground">{k.l}</div>
            <div className="font-mono text-3xl font-bold text-primary">{isLoading ? "…" : k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title="Ocorrências por dia">
          <BarChart data={s.porDia}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={11} /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip {...tip} /><Bar dataKey="total" fill="var(--chart-1)" radius={[3, 3, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Por faixa horária">
          <BarChart data={s.porHora}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="nome" stroke="var(--muted-foreground)" fontSize={10} /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip {...tip} /><Bar dataKey="total" fill="var(--chart-2)" radius={[3, 3, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Top naturezas">
          <BarChart data={s.natureza} layout="vertical" margin={{ left: 40 }}><XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} /><YAxis type="category" dataKey="nome" width={150} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip {...tip} /><Bar dataKey="total" fill="var(--chart-1)" radius={[0, 3, 3, 0]} /></BarChart>
        </Chart>
        <Chart title="Top bairros">
          <BarChart data={s.bairro} layout="vertical" margin={{ left: 40 }}><XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} /><YAxis type="category" dataKey="nome" width={150} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip {...tip} /><Bar dataKey="total" fill="var(--chart-3)" radius={[0, 3, 3, 0]} /></BarChart>
        </Chart>
        <Chart title="Por situação">
          <PieChart><Pie data={s.status} dataKey="total" nameKey="nome" outerRadius={90}>{s.status.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length] ?? "var(--chart-1)"} />)}</Pie><Tooltip {...tip} /></PieChart>
        </Chart>
        <Chart title="Por origem do chamado">
          <PieChart><Pie data={s.origem} dataKey="total" nameKey="nome" innerRadius={50} outerRadius={90}>{s.origem.map((_, i) => <Cell key={i} fill={CORES[i % 5]} />)}</Pie><Tooltip {...tip} /></PieChart>
        </Chart>
      </div>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="card-3d animate-rise p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

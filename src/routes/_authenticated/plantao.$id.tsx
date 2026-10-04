import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Lock, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { FichaPlantao } from "@/components/ficha-plantao";
import { carregarAtividades, fmtDia, type Plantao, type PlantaoAtividade } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/plantao/$id")({
  head: () => ({ meta: [{ title: "Relatório de plantão · CAD" }] }),
  component: VerPlantao,
});

function VerPlantao() {
  const { id } = Route.useParams();
  const { data: me, isLoading: carregandoPerfil } = useMe();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plantao", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("plantoes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Este plantão não foi encontrado ou sua conta não tem permissão para visualizá-lo.");
      const { data: prof, error: profileError } = await supabase.from("profiles").select("nome").eq("id", data.operador_id).maybeSingle();
      if (profileError) throw profileError;
      const p = {
        ...data,
        guarnicoes: Array.isArray(data.guarnicoes) ? data.guarnicoes : [],
        postos: Array.isArray(data.postos) ? data.postos : [],
      } as unknown as Plantao;
      return { p, nome: prof?.nome ?? "" };
    },
  });

  if (carregandoPerfil || isLoading) return <div className="text-muted-foreground">Carregando plantão finalizado...</div>;
  if (!me) return <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Sua sessão não foi identificada. Saia e entre novamente no CAD.</div>;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 rounded-lg border border-destructive/40 p-5">
        <div className="flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="h-5 w-5" /> Não foi possível abrir este plantão</div>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Ocorreu um erro ao consultar o plantão no banco de dados."}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>
          <Button asChild variant="outline"><Link to="/historico"><ArrowLeft className="h-4 w-4" /> Voltar ao histórico</Link></Button>
        </div>
      </div>
    );
  }

  const { p, nome } = data;
  const params = new URLSearchParams(window.location.search);
  const modoVisualizar = params.get("modo") === "visualizar";
  const pdf = params.get("pdf") === "1";

  if (modoVisualizar && pdf) {
    return <RelatorioPdfPlantao p={p} operadorNome={nome} />;
  }

  const editavel = me.isAdmin || (p.status === "aberto" && p.operador_id === me.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link to="/historico" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" /> Histórico</Link>
          <h1 className="text-gradient text-2xl">Plantão {p.turno} · {fmtDia(p.data_inicio)}</h1>
          <div className="text-xs text-muted-foreground">Operador: {nome} · {p.status === "aberto" ? "em andamento" : "encerrado"}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir relatório</Button>
        </div>
      </div>
      {p.status !== "aberto" && !me.isAdmin && (
        <div className="flex items-center gap-2 rounded border border-warning/50 p-3 text-sm text-warning print:hidden"><Lock className="h-4 w-4" /> Plantão encerrado — somente o administrador pode alterar.</div>
      )}
      {p.status !== "aberto" && me.isAdmin && (
        <div className="rounded border border-primary/30 bg-primary/5 p-3 text-sm print:hidden">Modo administrador: você pode revisar e editar este plantão finalizado. Clique em <strong>Salvar relatório</strong> para registrar as alterações.</div>
      )}
      <FichaPlantao plantao={p} editavel={editavel} operadorNome={nome} />
    </div>
  );
}


function RelatorioPdfPlantao({ p, operadorNome }: { p: Plantao; operadorNome: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["plantao", "pdf", p.id],
    queryFn: () => carregarAtividades(p),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">Gerando relatório do plantão...</div>;
  }

  if (isError || !data) {
    return <div className="mx-auto max-w-4xl space-y-3 p-8"><div className="font-semibold text-destructive">Não foi possível gerar o relatório.</div><div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Erro ao consolidar os dados do plantão."}</div></div>;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-4xl space-y-5 p-8 print:max-w-none print:p-6">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.22em]">GUARDA CIVIL MUNICIPAL</div>
            <h1 className="mt-1 text-2xl font-bold">RELATÓRIO DE PLANTÃO</h1>
            <div className="text-sm">Central de Atendimento e Despacho</div>
          </div>
          <div className="text-right text-sm">
            <div><strong>Data:</strong> {fmtDia(p.data_inicio)}</div>
            <div><strong>Turno:</strong> {p.turno}</div>
            <div><strong>Status:</strong> {p.status}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b pb-4 text-sm md:grid-cols-4">
          <Campo l="Operador" v={operadorNome} />
          <Campo l="Equipe" v={p.equipe} />
          <Campo l="Supervisor" v={p.supervisor} />
          <Campo l="Horário" v={p.horario} />
          <Campo l="Início" v={formatarDataHora(p.iniciado_em)} />
          <Campo l="Encerramento" v={formatarDataHora(p.encerrado_em)} />
          <Campo l="Nome do plantão" v={p.nome_plantao} />
          <Campo l="Operador de rádio" v={p.operador_radio} />
        </div>

        <SecaoPdf titulo="Guarnições">
          {p.guarnicoes?.length ? (
            <table className="w-full border-collapse text-xs">
              <thead><tr className="border-b"><th className="p-1 text-left">Viatura</th><th className="p-1 text-left">Encarregado</th><th className="p-1 text-left">Condutor</th><th className="p-1 text-left">Auxiliar 1</th><th className="p-1 text-left">Auxiliar 2</th></tr></thead>
              <tbody>{p.guarnicoes.map((g, i) => <tr key={i} className="border-b"><td className="p-1">{g.viatura || "—"}</td><td className="p-1">{g.encarregado || "—"}</td><td className="p-1">{g.condutor || "—"}</td><td className="p-1">{g.aux1 || "—"}</td><td className="p-1">{g.aux2 || "—"}</td></tr>)}</tbody>
            </table>
          ) : <VazioPdf />}
        </SecaoPdf>

        <SecaoPdf titulo="Ocorrências do plantão">
          {data.ocorrencias.length ? (
            <table className="w-full border-collapse text-xs">
              <thead><tr className="border-b"><th className="p-1 text-left">Protocolo</th><th className="p-1 text-left">Natureza</th><th className="p-1 text-left">Endereço</th><th className="p-1 text-left">Status</th><th className="p-1 text-left">Desfecho</th></tr></thead>
              <tbody>{data.ocorrencias.map((o) => <tr key={o.id} className="border-b"><td className="p-1 font-mono">{o.protocolo}</td><td className="p-1">{o.natureza}</td><td className="p-1">{o.endereco}{o.numero ? ", " + o.numero : ""}{o.bairro ? " — " + o.bairro : ""}</td><td className="p-1">{o.status}</td><td className="p-1">{o.desfecho || "—"}</td></tr>)}</tbody>
            </table>
          ) : <VazioPdf />}
        </SecaoPdf>

        <SecaoPdf titulo="Registros operacionais">
          {data.registros.length ? <div className="space-y-1 text-xs">{data.registros.map((r) => <div key={r.id} className="border-b pb-1"><strong>{formatarDataHora(r.hora)}</strong> — {data.usuarios[r.criado_por] ?? "Operador"}: {r.texto}</div>)}</div> : <VazioPdf />}
        </SecaoPdf>

        <SecaoPdf titulo="Ações e histórico">
          {data.acoes.length ? <div className="space-y-1 text-xs">{data.acoes.map((a, i) => <div key={i} className="border-b pb-1"><strong>{formatarDataHora(a.created_at)}</strong> — {data.usuarios[a.usuario_id] ?? "Operador"}{a.protocolo ? ` · Protocolo ${a.protocolo}` : ""}: {a.descricao}</div>)}</div> : <VazioPdf />}
        </SecaoPdf>

        <SecaoPdf titulo="Informações registradas">
          <Campo l="Atividades" v={p.atividades} />
          <Campo l="Materiais" v={p.materiais} />
          <Campo l="Informativo" v={p.informativo} />
          <Campo l="Atividades — verso" v={p.atividades_verso} />
          <Campo l="Observações" v={p.observacoes} />
        </SecaoPdf>

        <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs">
          <div className="border-t border-black pt-1">Operador responsável</div>
          <div className="border-t border-black pt-1">Supervisor de turno</div>
        </div>

        <div className="flex justify-end gap-2 pt-4 print:hidden">
          <button type="button" onClick={() => window.print()} className="rounded-md border px-4 py-2 text-sm font-semibold">Gerar / salvar PDF</button>
          <a href="/guardiaogcm/historico" className="rounded-md border px-4 py-2 text-sm">Voltar ao histórico</a>
        </div>
      </div>
    </div>
  );
}

function SecaoPdf({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="space-y-2 break-inside-avoid"><h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase">{titulo}</h2>{children}</section>;
}

function Campo({ l, v }: { l: string; v?: string | null }) {
  return <div className="min-w-0"><div className="text-[10px] font-bold uppercase text-gray-600">{l}</div><div className="whitespace-pre-wrap">{v || "—"}</div></div>;
}

function VazioPdf() {
  return <div className="text-xs text-gray-500">Nenhum registro lançado durante o plantão.</div>;
}

function formatarDataHora(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

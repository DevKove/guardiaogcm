import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AlertCircle, ArrowLeft, Lock, RefreshCw } from "lucide-react";
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
  // URLs antigas de visualização ainda chegavam ao gerador legado, de layout textual.
  // Redireciona essas URLs para o gerador visual único usado pelo Histórico.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("modo") === "visualizar" && params.get("pdf") === "1") {
      window.location.replace(`/guardiaogcm/relatorio-pdf/${encodeURIComponent(id)}?layout=20261004-v3`);
    }
  }, [id]);
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
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><div className="text-center"><div className="text-lg font-semibold">Abrindo o relatório atualizado…</div><div className="mt-2 text-sm text-slate-400">Redirecionando para o gerador visual oficial.</div></div></div>;
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
          <Button asChild variant="outline"><Link to="/relatorio-pdf/$id" params={{ id: p.id }}><span>Imprimir / Salvar PDF</span></Link></Button>
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


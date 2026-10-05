import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { carregarAtividades, fmtDia, type AlteracaoPlantao, type Plantao } from "@/lib/plantao";

export const Route = createFileRoute("/_authenticated/relatorio-pdf/$id")({
  head: () => ({ meta: [{ title: "Relatório de plantão · CAD" }] }),
  component: Relatorio,
});

function Relatorio() {
  const { id } = Route.useParams();
  const { data: me, isLoading: perfilLoading } = useMe();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plantao-relatorio", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("plantoes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Plantão não encontrado ou sem permissão para visualização.");

      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .select("nome, matricula")
        .eq("id", data.operador_id)
        .maybeSingle();
      if (profileError) throw profileError;

      const p = {
        ...data,
        guarnicoes: Array.isArray(data.guarnicoes) ? data.guarnicoes : [],
        postos: Array.isArray(data.postos) ? data.postos : [],
      } as unknown as Plantao;

      return { p, operador: prof?.nome ?? "", matricula: prof?.matricula ?? "" };
    },
  });

  if (perfilLoading || isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando relatório...</div>;
  if (!me) return <div className="p-8 text-sm text-destructive">Sessão não identificada.</div>;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-8">
        <div className="font-semibold text-destructive">Não foi possível abrir o relatório.</div>
        <div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Erro ao carregar o plantão."}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button>
          <Button asChild variant="outline"><Link to="/historico"><ArrowLeft className="mr-2 h-4 w-4" /> Histórico</Link></Button>
        </div>
      </div>
    );
  }

  return <BoletimPlantao p={data.p} operador={data.operador} matricula={data.matricula} />;
}

type Dados = Awaited<ReturnType<typeof carregarAtividades>>;

function BoletimPlantao({ p, operador, matricula }: { p: Plantao; operador: string; matricula: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plantao-relatorio-dados", p.id],
    queryFn: () => carregarAtividades(p),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Consolidando dados do plantão...</div>;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-8">
        <div className="font-semibold text-destructive">Não foi possível consolidar os dados.</div>
        <div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Erro ao consultar as atividades."}</div>
        <Button variant="outline" onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente</Button>
      </div>
    );
  }

  const dataHora = (v?: string | null) => v ? new Date(v).toLocaleString("pt-BR") : "—";
  const fim = p.encerrado_em ?? new Date().toISOString();
  const status = p.status === "aberto" ? "Em andamento" : "Encerrado";
  const imprimir = () => window.print();
  const endereco = (o: Dados["ocorrencias"][number]) => [o.endereco, o.numero ? "nº " + o.numero : null, o.bairro].filter(Boolean).join(", ") || "—";
  const camposAlterados = new Set(data.alteracoes.map((a) => a.campo));

  return (
    <div className="cad-print-document mx-auto max-w-3xl space-y-4 bg-card p-8 text-sm print:bg-transparent print:p-0">
      <div className="cad-print-toolbar mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="outline"><Link to="/historico"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link></Button>
        <Button onClick={imprimir}><Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF</Button>
      </div>

      <div className="flex items-center justify-between border-b-2 border-primary pb-3">
        <div>
          <div className="text-xs tracking-widest text-muted-foreground">GUARDA CIVIL MUNICIPAL</div>
          <div className="text-lg font-bold">RELATÓRIO DE PLANTÃO</div>
          <div className="text-xs text-muted-foreground">CENTRAL DE ATENDIMENTO E DESPACHO · ARAÇOIABA DA SERRA - SP</div>
        </div>
        <div className="text-right font-mono">
          <div className="text-xs text-muted-foreground">REFERÊNCIA</div>
          <div className="text-sm font-bold">{String(p.id).slice(0, 12).toUpperCase()}</div>
          <div className="text-xs">{fmtDia(p.data_inicio)} · {p.turno || "—"}</div>
        </div>
      </div>

      <Sec t="Dados gerais">
        <G l="Nome do plantão" v={p.nome_plantao} />
        <G l="Situação" v={status} />
        <G l="Data" v={fmtDia(p.data_inicio)} />
        <G l="Turno" v={p.turno} />
        <G l="Horário" v={p.horario} />
        <G l="Equipe / efetivo" v={p.equipe} />
        <G l="Supervisor" v={p.supervisor} />
        <G l="Operador de rádio" v={p.operador_radio} />
        <G l="Início efetivo" v={dataHora(p.iniciado_em)} />
        <G l="Encerramento efetivo" v={dataHora(p.encerrado_em)} />
        <G l="Período considerado" v={dataHora(p.iniciado_em) + " até " + dataHora(fim)} />
        <G l="Operador responsável" v={operador ? operador + (matricula ? " — Mat. " + matricula : "") : null} />
      </Sec>

      <Sec t="Alterações registradas no plantão">
        {data.alteracoes.length ? (
          <div className="col-span-2">
            <table className="cad-print-table w-full">
              <thead><tr><th className="text-left">Campo</th><th className="text-left">Valor registrado</th><th className="text-left">Data / hora</th><th className="text-left">Usuário</th></tr></thead>
              <tbody>
                {data.alteracoes.map((a) => (
                  <tr key={a.campo}>
                    <td className="font-semibold">{a.label}</td>
                    <td>{valorAlteracao(a, p)}</td>
                    <td className="whitespace-nowrap">{dataHora(a.created_at)}</td>
                    <td>{data.usuarios[a.usuario_id] || "Operador"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <G l="Resultado" v="Nenhum campo do formulário foi alterado durante o plantão." />}
      </Sec>

      <Sec t="Ocorrências lançadas ou alteradas">
        {data.ocorrencias.length ? (
          <div className="col-span-2">
            <table className="cad-print-table w-full">
              <thead><tr><th>Protocolo</th><th>Natureza</th><th>Local</th><th>Situação</th><th>Registro / alteração</th></tr></thead>
              <tbody>
                {data.ocorrencias.map((o, i) => (
                  <tr key={o.id ?? i}>
                    <td className="font-mono font-semibold">#{o.protocolo || "—"}</td>
                    <td>{o.natureza || "—"}</td>
                    <td>{endereco(o)}</td>
                    <td>{o.status || "—"}</td>
                    <td>{dataHora(o.created_at)}<br />Atualização: {dataHora(o.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <G l="Resultado" v="Nenhuma ocorrência foi lançada ou alterada durante o plantão." />}
      </Sec>

      <Sec t="Escalas lançadas ou alteradas">
        {data.escalas.length ? (
          <div className="col-span-2">
            <table className="cad-print-table w-full">
              <thead><tr><th>Agentes</th><th>Função</th><th>Horário</th><th>Observações</th></tr></thead>
              <tbody>
                {data.escalas.map((e, i) => <tr key={e.id ?? i}><td>{e.agentes || "—"}</td><td>{e.funcao || "—"}</td><td>{e.hora_inicio || "—"} – {e.hora_fim || "—"}</td><td>{e.observacao || "—"}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : <G l="Resultado" v="Nenhuma escala foi lançada ou alterada durante o plantão." />}
      </Sec>

      {camposAlterados.has("guarnicoes") && <Sec t="Guarnições">
        {p.guarnicoes?.length ? (
          <div className="col-span-2">
            <table className="cad-print-table w-full">
              <thead><tr><th>VTR</th><th>Encarregado</th><th>Condutor</th><th>Aux. 01</th><th>Aux. 02</th></tr></thead>
              <tbody>{p.guarnicoes.map((g, i) => <tr key={i}><td>{g.viatura || "—"}</td><td>{g.encarregado || "—"}</td><td>{g.condutor || "—"}</td><td>{g.aux1 || "—"}</td><td>{g.aux2 || "—"}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <G l="Resultado" v="Nenhuma guarnição informada." />}
      </Sec>}

      {camposAlterados.has("postos") && <Sec t="Postos e conferências">
        {p.postos?.length ? (
          <div className="col-span-2">
            <table className="cad-print-table w-full">
              <thead><tr><th>Posto</th><th>Conferência</th><th>Observação</th></tr></thead>
              <tbody>{p.postos.map((x, i) => <tr key={i}><td>{x.nome || "—"}</td><td>{x.ok ? "Conferido" : "Alteração / pendência"}</td><td>{x.obs || "—"}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <G l="Resultado" v="Nenhum posto informado." />}
      </Sec>}

      <Sec t="Registros operacionais">
        {data.registros.length ? (
          <div className="col-span-2">
            <table className="cad-print-table w-full">
              <thead><tr><th>Data / hora</th><th>Operador</th><th>Registro</th></tr></thead>
              <tbody>{data.registros.map((r, i) => <tr key={r.id ?? i}><td className="whitespace-nowrap">{dataHora(r.hora)}</td><td>{data.usuarios[r.criado_por] || "Operador"}</td><td className="whitespace-pre-wrap">{r.texto}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <G l="Resultado" v="Nenhum registro operacional foi lançado durante o plantão." />}
      </Sec>

      <Sec t="Histórico de ações">
        {data.acoes.length ? (
          <div className="col-span-2">
            <table className="cad-print-table w-full">
              <thead><tr><th>Data / hora</th><th>Usuário</th><th>Protocolo</th><th>Ação</th></tr></thead>
              <tbody>{data.acoes.map((a, i) => <tr key={i}><td className="whitespace-nowrap">{dataHora(a.created_at)}</td><td>{data.usuarios[a.usuario_id] || "Sistema"}</td><td>{a.protocolo ? "#" + a.protocolo : "—"}</td><td className="whitespace-pre-wrap">{a.descricao}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <G l="Resultado" v="Nenhuma ação registrada durante o plantão." />}
      </Sec>

      {(p.atividades || p.materiais || p.informativo || p.atividades_verso || p.observacoes) && (
        <Sec t="Informações do plantão">
          <G l="Atividades" v={p.atividades} />
          <G l="Materiais" v={p.materiais} />
          <G l="Informativo" v={p.informativo} />
          <G l="Atividades — verso" v={p.atividades_verso} />
          <G l="Observações" v={p.observacoes} />
        </Sec>
      )}

      <div className="cad-print-signatures grid grid-cols-2 gap-8 pt-12 text-center text-xs">
        <div className="border-t pt-1">{operador || " "}{matricula ? " — Mat. " + matricula : ""}<br />Operador responsável</div>
        <div className="border-t pt-1">{p.supervisor || " "}<br />Supervisor de turno</div>
      </div>
      <div className="text-center text-xs text-muted-foreground">Emitido em {new Date().toLocaleString("pt-BR")}</div>
    </div>
  );
}

function valorAlteracao(a: AlteracaoPlantao, p: Plantao) {
  const v = a.campo === "guarnicoes" ? p.guarnicoes : a.campo === "postos" ? p.postos : a.valor;
  if (Array.isArray(v)) return v.length ? v.map((x) => typeof x === "object" && x !== null ? Object.values(x as Record<string, unknown>).filter(Boolean).join(" · ") : String(x)).join(" | ") : "—";
  if (a.campo === "data_inicio" && typeof v === "string") return fmtDia(v);
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function Sec({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="cad-print-section">
      <h3 className="mb-1 border-b font-bold uppercase">{t}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">{children}</div>
    </div>
  );
}

function G({ l, v }: { l: string; v: string | null | undefined }) {
  return <div><span className="cad-print-muted text-muted-foreground">{l}: </span>{v || "—"}</div>;
}

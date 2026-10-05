import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRIORIDADES, STATUS, fmtData, fmtProtocolo, type Status } from "@/lib/cad";

const CAMPOS_HISTORICO: Record<string, string> = {
  natureza: "Natureza",
  prioridade: "Prioridade",
  status: "Situação",
  origem: "Origem",
  endereco: "Endereço",
  numero: "Número",
  bairro: "Bairro",
  referencia: "Referência",
  solicitante_nome: "Solicitante",
  solicitante_telefone: "Telefone do solicitante",
  relato: "Relato",
  viatura: "Viatura",
  viatura_id: "Vínculo da viatura",
  despachada_em: "Despacho",
  chegada_em: "Chegada",
  encerrada_em: "Finalização",
  desfecho: "Desfecho",
  plantao_id: "Plantão",
  updated_at: "Atualização",
};

export const Route = createFileRoute("/_authenticated/imprimir/$id")({
  head: () => ({ meta: [{ title: "Boletim de ocorrência · CAD" }] }),
  component: Imprimir,
});

function descricaoHistorico(descricao: string) {
  const prefixo = "Alteração registrada pelo banco. Campos:";
  if (!descricao.trim().toLowerCase().startsWith(prefixo.toLowerCase())) return descricao;

  const campos = descricao
    .slice(prefixo.length)
    .split(",")
    .map((campo) => campo.trim())
    .filter(Boolean);

  const nomes = [...new Set(campos.map((campo) => CAMPOS_HISTORICO[campo] ?? campo))];

  return nomes.length ? nomes.join(", ") : "Alteração registrada";
}

function Imprimir() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["imprimir", id],
    queryFn: async () => {
      const [o, env, hist] = await Promise.all([
        supabase.from("ocorrencias").select("*").eq("id", id).single(),
        supabase.from("ocorrencia_envolvidos").select("*").eq("ocorrencia_id", id).order("created_at"),
        supabase.from("ocorrencia_historico").select("*").eq("ocorrencia_id", id).order("created_at"),
      ]);
      const uids = [...new Set([o.data?.criado_por, ...(hist.data ?? []).map((h) => h.usuario_id)].filter(Boolean) as string[])];
      const { data: profs } = await supabase.from("profiles").select("id,nome,matricula").in("id", uids);
      const pm = new Map((profs ?? []).map((p) => [p.id, p]));
      return { o: o.data, env: env.data ?? [], hist: hist.data ?? [], pm };
    },
  });

  useEffect(() => {
    if (data?.o) setTimeout(() => window.print(), 400);
  }, [data]);

  if (!data?.o) return <div className="text-muted-foreground">Carregando...</div>;
  const { o, env, hist, pm } = data;
  const autor = pm.get(o.criado_por);

  return (
    <div className="cad-print-document mx-auto max-w-3xl space-y-4 bg-card p-8 text-sm print:bg-transparent print:p-0">
      <div className="cad-print-header flex items-center justify-between border-b-2 border-primary pb-3">
        <div>
          <div className="text-xs tracking-widest text-muted-foreground">GUARDA CIVIL MUNICIPAL</div>
          <div className="text-lg font-bold">BOLETIM DE ATENDIMENTO DE OCORRÊNCIA</div>
        </div>
        <div className="text-right font-mono">
          <div className="text-xs text-muted-foreground">PROTOCOLO</div>
          <div className="text-xl font-bold">{fmtProtocolo(o.protocolo, o.created_at)}</div>
        </div>
      </div>

      <Sec t="Dados gerais">
        <G l="Natureza" v={o.natureza} /><G l="Prioridade" v={PRIORIDADES[o.prioridade]?.label} />
        <G l="Situação" v={STATUS[o.status as Status].label} /><G l="Origem" v={o.origem} />
        <G l="Abertura" v={fmtData(o.created_at)} /><G l="Despacho" v={fmtData(o.despachada_em)} />
        <G l="Chegada" v={fmtData(o.chegada_em)} /><G l="Finalização" v={fmtData(o.encerrada_em)} />
        <G l="Viatura" v={o.viatura} /><G l="Desfecho" v={o.desfecho} />
      </Sec>
      <Sec t="Local">
        <G l="Endereço" v={`${o.endereco}${o.numero ? ", " + o.numero : ""}`} /><G l="Bairro" v={o.bairro} />
        <G l="Referência" v={o.referencia} />
      </Sec>
      <Sec t="Solicitante">
        <G l="Nome" v={o.solicitante_nome} /><G l="Telefone" v={o.solicitante_telefone} />
      </Sec>
      <div>
        <h3 className="mb-1 border-b font-bold uppercase">Relato</h3>
        <p className="whitespace-pre-wrap">{o.relato}</p>
      </div>
      {env.length > 0 && (
        <div>
          <h3 className="mb-1 border-b font-bold uppercase">Envolvidos</h3>
          <table className="w-full">
            <tbody>
              {env.map((e) => (
                <tr key={e.id} className="border-b"><td className="py-1 pr-2 font-semibold">{e.tipo}</td><td>{e.nome}</td><td>{e.documento}</td><td>{e.telefone}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hist.length > 0 && (
        <div>
          <h3 className="mb-1 border-b font-bold uppercase">Histórico</h3>
          {hist.map((h) => (
            <div key={h.id} className="py-0.5">
              <span className="font-mono text-xs">{fmtData(h.created_at)}</span> — {pm.get(h.usuario_id)?.nome ?? "Sistema"}: <span className="whitespace-pre-wrap">{descricaoHistorico(h.descricao)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs">
        <div className="border-t pt-1">{autor?.nome}{autor?.matricula ? ` — Mat. ${autor.matricula}` : ""}<br />Operador responsável</div>
        <div className="border-t pt-1">Supervisor de turno</div>
      </div>
      <div className="text-center text-xs text-muted-foreground">Emitido em {new Date().toLocaleString("pt-BR")}</div>
    </div>
  );
}

function Sec({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 border-b font-bold uppercase">{t}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">{children}</div>
    </div>
  );
}
function G({ l, v }: { l: string; v: string | null | undefined }) {
  return <div><span className="text-muted-foreground">{l}: </span>{v || "—"}</div>;
}

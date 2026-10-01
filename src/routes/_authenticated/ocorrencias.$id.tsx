import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/use-me";
import { PRIORIDADES, STATUS, fmtData, fmtProtocolo, type Status } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/ocorrencias/$id")({
  head: () => ({ meta: [{ title: "Ocorrência · CAD" }] }),
  component: Detalhe,
});

function Detalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [nota, setNota] = useState("");
  const [viatura, setViatura] = useState("");

  const { data: o, isLoading } = useQuery({
    queryKey: ["ocorrencia", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ocorrencias").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: hist = [] } = useQuery({
    queryKey: ["historico", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ocorrencia_historico")
        .select("*")
        .eq("ocorrencia_id", id)
        .order("created_at", { ascending: false });
      const ids = [...new Set((data ?? []).map((h) => h.usuario_id))];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,nome").in("id", ids)
        : { data: [] };
      const map = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      return (data ?? []).map((h) => ({ ...h, autor: map.get(h.usuario_id) || "—" }));
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ocorrencia", id] });
    qc.invalidateQueries({ queryKey: ["historico", id] });
    qc.invalidateQueries({ queryKey: ["ocorrencias"] });
  };

  async function log(descricao: string) {
    await supabase.from("ocorrencia_historico").insert({ ocorrencia_id: id, usuario_id: me!.id, descricao });
  }

  async function update(patch: { status?: Status; viatura?: string }, descricao: string) {
    const { data, error } = await supabase.from("ocorrencias").update(patch).eq("id", id).select("id");
    if (error || !data?.length) {
      toast.error("Sem permissão para alterar esta ocorrência");
      return;
    }
    await log(descricao);
    toast.success("Atualizado");
    refresh();
  }

  async function addNota() {
    if (!nota.trim()) return;
    await log(nota.trim());
    setNota("");
    refresh();
  }

  if (isLoading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!o) return <div>Ocorrência não encontrada.</div>;

  const st = o.status as Status;
  const podeEditar = me && (me.isSupervisor || o.criado_por === me.id);
  const ativa = st === "aberta" || st === "em_atendimento";

  return (
    <div className="space-y-6">
      <Link to="/painel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs tracking-widest text-muted-foreground">PROTOCOLO</div>
          <h1 className="font-mono text-3xl font-bold text-primary">{fmtProtocolo(o.protocolo, o.created_at)}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORIDADES[o.prioridade]?.cls}`}>
              {PRIORIDADES[o.prioridade]?.label}
            </span>
            <span className={`rounded border px-2 py-0.5 text-xs ${STATUS[st].cls}`}>{STATUS[st].label}</span>
          </div>
        </div>
        {podeEditar && ativa && (
          <div className="flex flex-wrap gap-2">
            {st === "aberta" && (
              <Button variant="secondary" onClick={() => update({ status: "em_atendimento" }, "Status: Em atendimento")}>
                Iniciar atendimento
              </Button>
            )}
            <Button onClick={() => update({ status: "encerrada" }, "Ocorrência encerrada")}>Encerrar</Button>
            <Button variant="destructive" onClick={() => update({ status: "cancelada" }, "Ocorrência cancelada")}>
              Cancelar
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 rounded-md border bg-card p-5 md:grid-cols-2">
            <Field l="Natureza" v={o.natureza} />
            <Field l="Abertura" v={fmtData(o.created_at)} />
            <Field l="Endereço" v={o.endereco} />
            <Field l="Bairro" v={o.bairro} />
            <Field l="Referência" v={o.referencia} />
            <Field l="Viatura" v={o.viatura} />
            <Field l="Solicitante" v={o.solicitante_nome} />
            <Field l="Telefone" v={o.solicitante_telefone} />
            {o.encerrada_em && <Field l="Finalizada em" v={fmtData(o.encerrada_em)} />}
          </div>
          <div className="rounded-md border bg-card p-5">
            <div className="text-xs uppercase text-muted-foreground">Relato</div>
            <p className="mt-2 whitespace-pre-wrap">{o.relato}</p>
          </div>
          {podeEditar && ativa && (
            <div className="flex gap-2 rounded-md border bg-card p-5">
              <Input placeholder="Prefixo da viatura (ex: GM-12)" value={viatura} onChange={(e) => setViatura(e.target.value)} />
              <Button
                variant="secondary"
                onClick={() => viatura.trim() && update({ viatura: viatura.trim() }, `Viatura ${viatura.trim()} empenhada`)}
              >
                Empenhar viatura
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-md border bg-card p-5">
          <h2 className="font-semibold text-primary">Histórico</h2>
          <div className="space-y-2">
            <Textarea rows={2} placeholder="Adicionar informação..." value={nota} onChange={(e) => setNota(e.target.value)} />
            <Button size="sm" onClick={addNota} className="w-full">Adicionar</Button>
          </div>
          <ol className="space-y-3 border-l pl-4">
            {hist.map((h) => (
              <li key={h.id} className="text-sm">
                <div className="font-mono text-xs text-muted-foreground">{fmtData(h.created_at)} · {h.autor}</div>
                <div className="whitespace-pre-wrap">{h.descricao}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Field({ l, v }: { l: string; v: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{l}</div>
      <div>{v || "—"}</div>
    </div>
  );
}

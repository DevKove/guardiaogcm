import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Lock, Play, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { FichaPlantao } from "@/components/ficha-plantao";
import { carregarAtividades, fmtDia, turnoAtual, type Plantao } from "@/lib/plantao";

export function PlantaoAtual() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: plantao, isLoading } = useQuery({
    queryKey: ["plantao", "atual", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase.from("plantoes").select("*").eq("operador_id", me!.id).eq("status", "aberto").maybeSingle();
      return (data as unknown as Plantao) ?? null;
    },
  });

  async function iniciar() {
    setBusy(true);
    const t = turnoAtual();
    const [{ data: vtrs }, { data: postos }] = await Promise.all([
      supabase.from("viaturas").select("prefixo").eq("ativa", true).order("prefixo"),
      supabase.from("postos_fixos").select("nome").eq("ativo", true).order("nome"),
    ]);
    const { error } = await supabase.from("plantoes").insert({
      operador_id: me!.id, turno: t.turno, data_inicio: t.data, horario: t.horario, operador_radio: me!.nome,
      guarnicoes: (vtrs ?? []).map((v) => ({ viatura: v.prefixo, encarregado: "", condutor: "", aux1: "", aux2: "" })),
      postos: (postos ?? []).map((p) => ({ nome: p.nome, ok: true, obs: "" })),
    } as never);
    setBusy(false);
    if (error) { toast.error("Erro ao iniciar plantão: " + error.message); return; }
    toast.success(`Plantão ${t.turno} iniciado`);
    qc.invalidateQueries({ queryKey: ["plantao"] });
  }

  async function encerrar() {
    if (!plantao || !confirm("Encerrar o plantão? Depois disso somente o administrador poderá alterar.")) return;
    setBusy(true);
    const atv = await carregarAtividades(plantao);
    const { error } = await supabase.from("plantoes").update({
      status: "encerrado", encerrado_em: new Date().toISOString(),
      resumo: { operador: me!.nome, ...atv },
    } as never).eq("id", plantao.id);
    setBusy(false);
    if (error) { toast.error("Erro ao encerrar: " + error.message); return; }
    toast.success("Plantão encerrado e salvo no histórico");
    qc.invalidateQueries({ queryKey: ["plantao"] });
  }

  if (isLoading || !me) return null;

  if (!plantao) {
    const t = turnoAtual();
    return (
      <div className="card-3d animate-rise flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="icon-chip h-11 w-11"><ClipboardCheck className="h-5 w-5" /></div>
          <div>
            <div className="font-semibold">Nenhum plantão aberto</div>
            <div className="text-sm text-muted-foreground">Pelo horário atual: <b>{t.turno}</b> de {fmtDia(t.data)} ({t.horario}). Viaturas e postos já vêm preenchidos.</div>
          </div>
        </div>
        <Button onClick={iniciar} disabled={busy}><Play className="h-4 w-4" /> Iniciar plantão</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card-3d animate-rise flex flex-wrap items-center justify-between gap-3 p-4 print:hidden">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-success live-dot" />
          <div>
            <div className="font-mono text-xs tracking-widest text-muted-foreground">PLANTÃO EM ANDAMENTO</div>
            <div className="text-lg font-bold">{plantao.turno} · {fmtDia(plantao.data_inicio)} · {plantao.horario}</div>
            <div className="text-xs text-muted-foreground">Iniciado às {new Date(plantao.iniciado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} por {me.nome}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button>
          <Button variant="destructive" onClick={encerrar} disabled={busy}><Lock className="h-4 w-4" /> Encerrar plantão</Button>
        </div>
      </div>
      <div className="print:hidden-children">
        <FichaPlantao plantao={plantao} editavel operadorNome={me.nome} />
      </div>
    </div>
  );
}

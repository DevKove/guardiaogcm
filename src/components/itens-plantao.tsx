import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Package, Pencil, Power, Radio, Shield, RotateCcw, Save, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/hooks/use-me";

export type ItemCategoria = "arma" | "radio" | "cad";

const SITUACOES = ["OK", "AVARIADO", "EXTRAVIADO", "AUSENTE"] as const;
type Situacao = (typeof SITUACOES)[number];

const CONFIG = {
  arma: { label: "Armas", kicker: "CONTROLE DE ARMAMENTO", icon: Shield, asset: "pistola.gif", movimenta: true },
  radio: { label: "Rádios", kicker: "COMUNICAÇÃO OPERACIONAL", icon: Radio, asset: "walkie-talkie.gif", movimenta: true },
  cad: { label: "CAD", kicker: "CONFERÊNCIA OPERACIONAL", icon: ClipboardCheck, asset: "caderno.gif", movimenta: false },
} as const;

type Item = {
  id: string; categoria: ItemCategoria; nome: string; identificacao: string | null;
  patrimonio: string | null; ativo: boolean; observacao: string | null;
};
type Movimento = {
  id: string; item_id: string; status: "pendente" | "retirado" | "devolvido" | "conferido";
  situacao: Situacao;
  retirado_por: string | null; retirado_em: string | null; entregue_por: string | null;
  entregue_em: string | null; conferido_por: string | null; conferido_em: string | null;
};
type Equipe = { id: string; nome: string; matricula: string | null };
type HistoricoMovimento = { id: string; item_id: string; retirado_por: string; retirado_em: string; entregue_por: string | null; entregue_em: string | null; registrado_por: string };

export function ItensPlantao({ categoria }: { categoria: ItemCategoria }) {
  const cfg = CONFIG[categoria];
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [form, setForm] = useState({ id: "", nome: "", identificacao: "", patrimonio: "", observacao: "" });
  const [retirados, setRetirados] = useState<Record<string, string>>({});
  const [entregues, setEntregues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: plantao } = useQuery({
    queryKey: ["itens-plantao-atual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plantoes").select("id,status,turno,data_inicio").eq("status", "aberto").maybeSingle();
      if (error) throw error;
      return data as { id: string; status: string; turno: string; data_inicio: string } | null;
    },
    refetchInterval: 15000,
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["itens-catalogo", categoria],
    queryFn: async () => {
      const { data, error } = await supabase.from("itens").select("*").eq("categoria", categoria).order("ativo", { ascending: false }).order("nome");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const { data: movimentos = [] } = useQuery({
    queryKey: ["itens-movimentos", plantao?.id, categoria],
    enabled: !!plantao?.id,
    queryFn: async () => {
      const ids = itens.map((i) => i.id);
      if (!ids.length || !plantao?.id) return [] as Movimento[];
      const { data, error } = await supabase.from("plantao_itens").select("*").eq("plantao_id", plantao.id).in("item_id", ids);
      if (error) throw error;
      return (data ?? []) as Movimento[];
    },
  });

  const { data: historicoMovimentos = [] } = useQuery({
    queryKey: ["itens-historico-movimentos", plantao?.id, categoria],
    enabled: !!plantao?.id && cfg.movimenta,
    queryFn: async () => {
      const ids = itens.map((i) => i.id);
      if (!ids.length || !plantao?.id) return [] as HistoricoMovimento[];
      const { data, error } = await supabase
        .from("plantao_item_movimentos")
        .select("id,item_id,retirado_por,retirado_em,entregue_por,entregue_em,registrado_por")
        .eq("plantao_id", plantao.id)
        .in("item_id", ids)
        .order("retirado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HistoricoMovimento[];
    },
  });

  const { data: equipe = [] } = useQuery({
    queryKey: ["itens-equipe-ativa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipe").select("id,nome,matricula").eq("ativo", true).order("nome");
      if (error) throw error;
      return (data ?? []) as Equipe[];
    },
  });

  const movimentoPorItem = new Map(movimentos.map((m) => [m.item_id, m]));
  const historicoPorItem = new Map<string, HistoricoMovimento>();
  for (const registro of historicoMovimentos) {
    if (!historicoPorItem.has(registro.item_id)) historicoPorItem.set(registro.item_id, registro);
  }
  const nomeEquipe = (id: string | null) => equipe.find((e) => e.id === id)?.nome ?? "—";
  const hora = (value: string | null) => value ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

  async function salvarItem(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.isAdmin) return;
    if (form.nome.trim().length < 2) return toast.error("Informe o nome do item.");
    setBusy("catalogo");
    const payload = {
      categoria, nome: form.nome.trim(), identificacao: form.identificacao.trim() || null,
      patrimonio: form.patrimonio.trim() || null, observacao: form.observacao.trim() || null,
      ...(!form.id ? { criado_por: me.id } : {}),
    };
    const { error } = form.id
      ? await supabase.from("itens").update(payload).eq("id", form.id)
      : await supabase.from("itens").insert(payload);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Item atualizado." : "Item cadastrado.");
    setForm({ id: "", nome: "", identificacao: "", patrimonio: "", observacao: "" });
    qc.invalidateQueries({ queryKey: ["itens-catalogo", categoria] });
    return null;
  }

  async function alternarAtivo(item: Item) {
    if (!me?.isAdmin) return;
    const { error } = await supabase.from("itens").update({ ativo: !item.ativo }).eq("id", item.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["itens-catalogo", categoria] });
  }

  async function registrarMovimento(item: Item, tipo: "retirada" | "entrega") {
    if (!plantao?.id || !me) return toast.error("Não há plantão aberto.");
    const pessoa = tipo === "retirada" ? retirados[item.id] : entregues[item.id];
    if (!pessoa) return toast.error(tipo === "retirada" ? "Selecione o responsável pela retirada." : "Selecione o responsável pela entrega.");
    setBusy(item.id + tipo);
    const atual = movimentoPorItem.get(item.id);
    const historicoAtual = historicoPorItem.get(item.id);
    const agora = new Date().toISOString();

    if (tipo === "retirada") {
      if (historicoAtual && !historicoAtual.entregue_em) {
        setBusy(null);
        return toast.error("Este item já está retirado. Registre a entrega antes de uma nova retirada.");
      }
      const { error: historicoError } = await supabase.from("plantao_item_movimentos").insert({
        plantao_id: plantao.id,
        item_id: item.id,
        retirado_por: pessoa,
        retirado_em: agora,
        registrado_por: me.id,
      });
      if (historicoError) {
        setBusy(null);
        return toast.error(historicoError.message);
      }
      const payload = { status: "retirado" as const, retirado_por: pessoa, retirado_em: agora, entregue_por: null, entregue_em: null };
      const result = atual
        ? await supabase.from("plantao_itens").update(payload).eq("id", atual.id)
        : await supabase.from("plantao_itens").insert({ plantao_id: plantao.id, item_id: item.id, ...payload });
      if (result.error) {
        setBusy(null);
        return toast.error(result.error.message);
      }
      toast.success("Retirada registrada com responsável e horário.");
    } else {
      if (!historicoAtual || historicoAtual.entregue_em) {
        setBusy(null);
        return toast.error("Não há retirada em aberto para este item.");
      }
      const { error: historicoError } = await supabase.from("plantao_item_movimentos").update({
        entregue_por: pessoa,
        entregue_em: agora,
      }).eq("id", historicoAtual.id);
      if (historicoError) {
        setBusy(null);
        return toast.error(historicoError.message);
      }
      const payload = { status: "devolvido" as const, entregue_por: pessoa, entregue_em: agora };
      const result = atual
        ? await supabase.from("plantao_itens").update(payload).eq("id", atual.id)
        : await supabase.from("plantao_itens").insert({ plantao_id: plantao.id, item_id: item.id, ...payload });
      if (result.error) {
        setBusy(null);
        return toast.error(result.error.message);
      }
      toast.success("Entrega registrada com responsável e horário.");
    }

    setBusy(null);
    qc.invalidateQueries({ queryKey: ["itens-movimentos", plantao.id, categoria] });
    qc.invalidateQueries({ queryKey: ["itens-historico-movimentos", plantao.id, categoria] });
    return null;
  }

  async function alterarSituacao(item: Item, situacao: Situacao) {
    if (!me || me.isAdmin || categoria !== "cad") return;
    if (!plantao?.id) return toast.error("Não há plantão aberto.");
    setBusy(item.id + "situacao");
    const atual = movimentoPorItem.get(item.id);
    const payload = {
      situacao,
      status: situacao === "OK" ? ("conferido" as const) : ("pendente" as const),
      conferido_por: me.id,
      conferido_em: new Date().toISOString(),
    };
    const result = atual
      ? await supabase.from("plantao_itens").update(payload).eq("id", atual.id)
      : await supabase.from("plantao_itens").insert({ plantao_id: plantao.id, item_id: item.id, ...payload });
    setBusy(null);
    if (result.error) return toast.error(result.error.message);
    toast.success("Situação de " + item.nome + " atualizada para " + situacao + ".");
    qc.invalidateQueries({ queryKey: ["itens-movimentos", plantao.id, categoria] });
  }
  async function conferir(item: Item, checked: boolean) {
    if (!plantao?.id) return toast.error("Não há plantão aberto.");
    setBusy(item.id + "conferir");
    const atual = movimentoPorItem.get(item.id);
    const agora = new Date().toISOString();
    const payload = checked
      ? { status: "conferido" as const, conferido_por: me?.id ?? null, conferido_em: agora }
      : { status: "pendente" as const, conferido_por: null, conferido_em: null };
    const result = atual
      ? await supabase.from("plantao_itens").update(payload).eq("id", atual.id)
      : await supabase.from("plantao_itens").insert({ plantao_id: plantao.id, item_id: item.id, ...payload });
    setBusy(null);
    if (result.error) return toast.error(result.error.message);
    qc.invalidateQueries({ queryKey: ["itens-movimentos", plantao.id, categoria] });
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={cfg.icon} asset={cfg.asset} kicker={cfg.kicker} title={cfg.label}>
        {plantao ? <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">Plantão {plantao.turno} aberto</span> : <span className="rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground">Nenhum plantão aberto</span>}
      </PageHeader>

      {me?.isAdmin && (
        <section className="card-3d space-y-4 p-4">
          <div className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">{form.id ? "Editar item" : "Cadastrar item"}</h2><p className="text-xs text-muted-foreground">O catálogo é administrado pelo perfil administrador.</p></div></div>
          <form onSubmit={salvarItem} className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2"><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder={categoria === "arma" ? "Ex.: Pistola Taurus..." : categoria === "radio" ? "Ex.: Rádio HT..." : "Ex.: Lanterna..."}/></div>
            <div className="space-y-1"><Label>Identificação</Label><Input value={form.identificacao} onChange={(e) => setForm({ ...form, identificacao: e.target.value })} placeholder="Número/série"/></div>
            <div className="space-y-1"><Label>Patrimônio</Label><Input value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} placeholder="Patrimônio"/></div>
            <div className="space-y-1 md:col-span-3"><Label>Observação</Label><Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Informações adicionais"/></div>
            <div className="flex items-end gap-2"><Button type="submit" disabled={busy === "catalogo"}><Save className="h-4 w-4"/>{busy === "catalogo" ? "Salvando..." : "Salvar"}</Button>{form.id && <Button type="button" variant="outline" onClick={() => setForm({ id: "", nome: "", identificacao: "", patrimonio: "", observacao: "" })}>Cancelar</Button>}</div>
          </form>
        </section>
      )}

      <section className="card-3d overflow-hidden">
        <div className="border-b p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Conferência do plantão</h2><p className="text-xs text-muted-foreground">{itens.filter(i => i.ativo).length} item(ns) ativo(s) no catálogo.</p></div><div className="text-xs text-muted-foreground">{cfg.movimenta ? "Retirada e devolução" : "Conferência"}</div></div></div>
        {isLoading ? <div className="p-8 text-center text-muted-foreground">Carregando itens...</div> : itens.length === 0 ? <div className="p-10 text-center text-muted-foreground">Nenhum item cadastrado nesta categoria.</div> : (
          <div className="divide-y">
            {itens.map((item) => {
              const mov = movimentoPorItem.get(item.id);
              const conferido = mov?.status === "conferido";
              const retirado = mov?.status === "retirado";
              const devolvido = mov?.status === "devolvido";
              const historico = historicoPorItem.get(item.id);
              const situacao = mov?.situacao ?? "OK";
              return (
                <article key={item.id} className={`p-4 transition ${!item.ativo ? "opacity-50" : "hover:bg-accent/30"}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><h3 className="font-semibold">{item.nome}</h3>{item.identificacao && <span className="font-mono text-xs text-muted-foreground">#{item.identificacao}</span>}{!item.ativo && <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">INATIVO</span>}</div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>Patrimônio: {item.patrimonio || "—"}</span>{item.observacao && <span>{item.observacao}</span>}</div>
                      {cfg.movimenta && (mov || historico) && <div className="mt-2 flex flex-wrap gap-3 text-xs"><span className={retirado ? "text-warning" : devolvido ? "text-success" : "text-muted-foreground"}>{devolvido ? "DEVOLVIDO" : retirado ? "RETIRADO" : "PENDENTE"}</span>{historico ? <><span>Retirada: {nomeEquipe(historico.retirado_por)} às {hora(historico.retirado_em)}</span><span>{historico.entregue_em ? <>Entrega: {nomeEquipe(historico.entregue_por)} às {hora(historico.entregue_em)}</> : "Entrega pendente"}</span></> : <><span>Retirada: {nomeEquipe(mov?.retirado_por ?? null)} às {hora(mov?.retirado_em ?? null)}</span><span>Entrega: {nomeEquipe(mov?.entregue_por ?? null)} às {hora(mov?.entregue_em ?? null)}</span></>}</div>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {me?.isAdmin && <><Button size="sm" variant="ghost" onClick={() => setForm({ id: item.id, nome: item.nome, identificacao: item.identificacao ?? "", patrimonio: item.patrimonio ?? "", observacao: item.observacao ?? "" })}><Pencil className="h-3.5 w-3.5"/> Editar</Button><Button size="sm" variant="ghost" onClick={() => alternarAtivo(item)}><Power className="h-3.5 w-3.5"/> {item.ativo ? "Desativar" : "Ativar"}</Button></>}
                      {plantao && item.ativo && (cfg.movimenta ? (
                        <>
                          <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={retirados[item.id] ?? (historico && !historico.entregue_em ? historico.retirado_por : "")} onChange={(e) => setRetirados({ ...retirados, [item.id]: e.target.value })}><option value="" className="bg-popover">Responsável pela retirada</option>{equipe.map((e) => <option key={e.id} value={e.id} className="bg-popover">{e.nome}{e.matricula ? ` · ${e.matricula}` : ""}</option>)}</select>
                          <Button size="sm" disabled={busy === item.id + "retirada" || !!(historico && !historico.entregue_em)} onClick={() => registrarMovimento(item, "retirada")}><UserRound className="h-3.5 w-3.5"/> Retirar</Button>
                          <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={entregues[item.id] ?? (historico && !historico.entregue_em ? "" : historico?.entregue_por ?? mov?.entregue_por ?? "")} onChange={(e) => setEntregues({ ...entregues, [item.id]: e.target.value })}><option value="" className="bg-popover">Responsável pela entrega</option>{equipe.map((e) => <option key={e.id} value={e.id} className="bg-popover">{e.nome}{e.matricula ? ` · ${e.matricula}` : ""}</option>)}</select>
                          <Button size="sm" variant="outline" disabled={busy === item.id + "entrega" || !historico || !!historico.entregue_em} onClick={() => registrarMovimento(item, "entrega")}><RotateCcw className="h-3.5 w-3.5"/> Entregar</Button>
                        </>
                      ) : categoria === "cad" && !me?.isAdmin ? (
                        <select aria-label={"Situação de " + item.nome} className="h-9 min-w-[150px] rounded-md border border-input bg-background px-3 text-xs font-medium" value={situacao} disabled={busy === item.id + "situacao"} onChange={(e) => alterarSituacao(item, e.target.value as Situacao)}>
                          {SITUACOES.map((opcao) => <option key={opcao} value={opcao} className="bg-popover">{opcao}</option>)}
                        </select>
                      ) : (
                        <Button size="sm" variant={conferido ? "outline" : "default"} onClick={() => conferir(item, !conferido)} disabled={busy === item.id + "conferir"}>{conferido ? <><CheckCircle2 className="h-4 w-4"/> Conferido</> : <><ClipboardCheck className="h-4 w-4"/> Conferir</>}</Button>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

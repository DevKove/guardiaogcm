import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Copy, Printer, Sun, Moon, Car, School, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-me";
import { PageHeader, StatCard } from "@/components/page-header";
import { FUNCOES_ESCALA, TURNOS, selectCls } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/escalas")({
  head: () => ({ meta: [{ title: "Escalas de serviço · CAD" }, { name: "description", content: "Escala diária de agentes, postos e viaturas." }] }),
  component: Escalas,
});

type Form = { id?: string; data: string; turno: string; hora_inicio: string; hora_fim: string; agentes: string; equipe_ids: string[]; funcao: string; posto_id: string; viatura_id: string; observacao: string };

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function addDias(s: string, n: number) { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); }

function Escalas() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [dia, setDia] = useState(iso(new Date()));
  const [edit, setEdit] = useState<Form | null>(null);
  const vazio: Form = { data: dia, turno: "Diurno", hora_inicio: "07:00", hora_fim: "19:00", agentes: "", equipe_ids: [], funcao: "Patrulhamento", posto_id: "", viatura_id: "", observacao: "" };

  const { data = [] } = useQuery({
    queryKey: ["escalas", dia],
    queryFn: async () => {
      const { data, error } = await supabase.from("escalas")
        .select("*, postos_fixos(nome, tipo), viaturas(prefixo)")
        .eq("data", dia).order("hora_inicio");
      if (error) throw error;
      return data;
    },
  });
  const { data: postos = [] } = useQuery({
    queryKey: ["postos"],
    queryFn: async () => (await supabase.from("postos_fixos").select("*").order("nome")).data ?? [],
  });
  const { data: efetivo = [] } = useQuery({
    queryKey: ["equipe-escalas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipe").select("id, nome, matricula, tipo, funcao").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; matricula: string | null; tipo: string; funcao: string }[];
    },
  });
  const { data: viaturas = [] } = useQuery({
    queryKey: ["viaturas-lite"],
    queryFn: async () => (await supabase.from("viaturas").select("id, prefixo").eq("ativa", true).order("prefixo")).data ?? [],
  });

  useEffect(() => {
    const ch = supabase.channel("escalas-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "escalas" }, () => qc.invalidateQueries({ queryKey: ["escalas"] }))
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [qc]);

  const porTurno = useMemo(() => {
    const m = new Map<string, typeof data>();
    data.forEach((e) => m.set(e.turno, [...(m.get(e.turno) ?? []), e]));
    return [...m.entries()];
  }, [data]);

  const totalAgentes = data.reduce((s, e) => s + e.agentes.split(/[,;\n]/).filter((x) => x.trim()).length, 0);

  async function remover(id: string) {
    if (!confirm("Remover esta escala?")) return;
    const { error } = await supabase.from("escalas").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["escalas"] });
  }
  async function copiarDiaAnterior() {
    const ant = addDias(dia, -1);
    const { data: prev, error } = await supabase.from("escalas").select("turno, hora_inicio, hora_fim, agentes, funcao, posto_id, viatura_id, observacao").eq("data", ant);
    if (error) return void toast.error(error.message);
    if (!prev?.length) return void toast.info("Não há escala no dia anterior.");
    const { error: e2 } = await supabase.from("escalas").insert(prev.map((p) => ({ ...p, data: dia })) as never);
    if (e2) return void toast.error(e2.message);
    toast.success(`${prev.length} escala(s) copiada(s)`);
    qc.invalidateQueries({ queryKey: ["escalas"] });
  }

  const dataLonga = new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarClock} kicker="EFETIVO" title="Escalas de serviço">
        <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4" /> Imprimir</Button>
        {me?.isSupervisor && (
          <>
            <Button variant="outline" onClick={copiarDiaAnterior} className="print:hidden"><Copy className="h-4 w-4" /> Copiar dia anterior</Button>
            <Button onClick={() => setEdit({ ...vazio })} className="print:hidden"><Plus className="h-4 w-4" /> Nova escala</Button>
          </>
        )}
      </PageHeader>

      <div className="card-3d flex flex-wrap items-center justify-between gap-3 p-3 print:hidden">
        <Button size="icon" variant="ghost" onClick={() => setDia(addDias(dia, -1))}><ChevronLeft /></Button>
        <div className="flex items-center gap-3">
          <Input type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} className="w-auto" />
          <span className="capitalize text-sm text-muted-foreground">{dataLonga}</span>
          <Button size="sm" variant="ghost" onClick={() => setDia(iso(new Date()))}>Hoje</Button>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setDia(addDias(dia, 1))}><ChevronRight /></Button>
      </div>
      <h2 className="hidden text-lg font-bold capitalize print:block">Escala de serviço — {dataLonga}</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:hidden">
        <StatCard icon={CalendarClock} label="Escalas no dia" value={data.length} />
        <StatCard icon={Users} label="Agentes escalados" value={totalAgentes} tone="text-info" delay={60} />
        <StatCard icon={School} label="Postos cobertos" value={new Set(data.map((e) => e.posto_id).filter(Boolean)).size} tone="text-success" delay={120} />
        <StatCard icon={Car} label="Viaturas em uso" value={new Set(data.map((e) => e.viatura_id).filter(Boolean)).size} tone="text-warning" delay={180} />
      </div>

      {porTurno.length === 0 && <div className="card-3d p-10 text-center text-muted-foreground">Nenhuma escala lançada para este dia.</div>}

      {porTurno.map(([turno, itens]) => {
        const Icon = turno === "Noturno" || turno === "Madrugada" ? Moon : Sun;
        return (
          <section key={turno} className="space-y-3">
            <h3 className="flex items-center gap-2 font-mono text-sm tracking-widest text-primary"><Icon className="h-4 w-4" />{turno.toUpperCase()} <span className="text-muted-foreground">· {itens.length}</span></h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {itens.map((e, i) => {
                const posto = e.postos_fixos as { nome: string } | null;
                const vtr = e.viaturas as { prefixo: string } | null;
                return (
                  <div key={e.id} className="card-3d lift animate-rise p-4" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{e.funcao}</span>
                      <span className="font-mono text-xs text-muted-foreground">{e.hora_inicio.slice(0, 5)} – {e.hora_fim.slice(0, 5)}</span>
                    </div>
                    <div className="mt-2 flex gap-2 text-sm"><Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{e.agentes}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {posto && <span className="flex items-center gap-1 rounded border px-2 py-0.5"><School className="h-3 w-3" />{posto.nome}</span>}
                      {vtr && <span className="flex items-center gap-1 rounded border px-2 py-0.5 font-mono"><Car className="h-3 w-3" />{vtr.prefixo}</span>}
                    </div>
                    {e.observacao && <p className="mt-2 text-xs italic text-muted-foreground">{e.observacao}</p>}
                    {me?.isSupervisor && (
                      <div className="mt-3 flex gap-1 border-t pt-2 print:hidden">
                        <Button size="sm" variant="ghost" onClick={() => setEdit({ id: e.id, data: e.data, turno: e.turno, hora_inicio: e.hora_inicio.slice(0, 5), hora_fim: e.hora_fim.slice(0, 5), agentes: e.agentes, equipe_ids: [], funcao: e.funcao, posto_id: e.posto_id ?? "", viatura_id: e.viatura_id ?? "", observacao: e.observacao ?? "" })}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => remover(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <EscalaDialog f={edit} onClose={() => setEdit(null)} postos={postos} viaturas={viaturas} efetivo={efetivo} />
    </div>
  );
}

function EscalaDialog({ f: init, onClose, postos, viaturas, efetivo }: { f: Form | null; onClose: () => void; postos: { id: string; nome: string; ativo: boolean }[]; viaturas: { id: string; prefixo: string }[]; efetivo: { id: string; nome: string; matricula: string | null; tipo: string; funcao: string }[] }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form | null>(null);
  const [equipeIds, setEquipeIds] = useState<string[]>([]);
  useEffect(() => { if (init) { setF(init); setEquipeIds(init.equipe_ids); } }, [init]);
  useEffect(() => {
    if (!init?.id) return;
    void supabase.from("escala_integrantes").select("equipe_id").eq("escala_id", init.id).then(({ data }) => {
      setEquipeIds((data ?? []).map((x) => x.equipe_id));
    });
  }, [init?.id]);
  if (!f) return null;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    const n = { ...f, [k]: v };
    if (k === "turno") {
      if (v === "Diurno") Object.assign(n, { hora_inicio: "07:00", hora_fim: "19:00" });
      if (v === "Noturno") Object.assign(n, { hora_inicio: "19:00", hora_fim: "07:00" });
    }
    setF(n);
  };
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    if (!equipeIds.length) return void toast.error("Selecione ao menos um integrante ativo da Equipe.");
    const membros = efetivo.filter((m) => equipeIds.includes(m.id));
    const { id } = f;
    const payload = {
      data: f.data,
      turno: f.turno,
      hora_inicio: f.hora_inicio,
      hora_fim: f.hora_fim,
      agentes: membros.map((m) => m.nome).join(", "),
      funcao: f.funcao,
      posto_id: f.posto_id || null,
      viatura_id: f.viatura_id || null,
      observacao: f.observacao || null,
    };
    let escalaId = id;
    if (id) {
      const { error } = await supabase.from("escalas").update(payload as never).eq("id", id);
      if (error) return void toast.error(error.message);
      const { error: delError } = await supabase.from("escala_integrantes").delete().eq("escala_id", id);
      if (delError) return void toast.error(delError.message);
    } else {
      const { data, error } = await supabase.from("escalas").insert(payload as never).select("id").single();
      if (error) return void toast.error(error.message);
      escalaId = data.id;
    }
    const { error: insError } = await supabase.from("escala_integrantes").insert(equipeIds.map((equipe_id) => ({ escala_id: escalaId, equipe_id })));
    if (insError) return void toast.error("Não foi possível vincular os integrantes: " + insError.message);
    toast.success(id ? "Escala atualizada" : "Escala lançada");
    onClose();
    qc.invalidateQueries({ queryKey: ["escalas"] });
  }
  return (
    <Dialog open={!!init} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar escala" : "Nova escala"}</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Data</Label><Input type="date" required value={f.data} onChange={set("data")} /></div>
          <div className="space-y-1"><Label>Turno</Label><select className={selectCls} value={f.turno} onChange={set("turno")}>{TURNOS.map((t) => <option key={t} className="bg-popover">{t}</option>)}</select></div>
          <div className="space-y-1"><Label>Início</Label><Input type="time" required value={f.hora_inicio} onChange={set("hora_inicio")} /></div>
          <div className="space-y-1"><Label>Fim</Label><Input type="time" required value={f.hora_fim} onChange={set("hora_fim")} /></div>
          <div className="col-span-2 space-y-1">
            <Label>Integrantes *</Label>
            <select
              multiple
              required
              className="min-h-28 w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none"
              value={equipeIds}
              onChange={(e) => setEquipeIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            >
              {efetivo.map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.tipo}{m.matricula ? ` · ${m.matricula}` : ""}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Somente integrantes ativos cadastrados em Equipe. Não é permitido digitar nomes.</p>
          </div>
          <div className="col-span-2 space-y-1"><Label>Função</Label><select className={selectCls} value={f.funcao} onChange={set("funcao")}>{FUNCOES_ESCALA.map((t) => <option key={t} className="bg-popover">{t}</option>)}</select></div>
          <div className="space-y-1"><Label>Posto fixo</Label>
            <select className={selectCls} value={f.posto_id} onChange={set("posto_id")}>
              <option value="" className="bg-popover">—</option>
              {postos.filter((p) => p.ativo || p.id === f.posto_id).map((p) => <option key={p.id} value={p.id} className="bg-popover">{p.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Viatura</Label>
            <select className={selectCls} value={f.viatura_id} onChange={set("viatura_id")}>
              <option value="" className="bg-popover">—</option>
              {viaturas.map((v) => <option key={v.id} value={v.id} className="bg-popover">{v.prefixo}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-1"><Label>Observações</Label><Input value={f.observacao} onChange={set("observacao")} /></div>
          <Button type="submit" className="col-span-2">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

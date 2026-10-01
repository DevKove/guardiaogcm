import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-me";
import { VSTATUS, selectCls, type VStatus } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/viaturas")({
  head: () => ({ meta: [{ title: "Viaturas · CAD" }] }),
  component: Viaturas,
});

function Viaturas() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data = [] } = useQuery({
    queryKey: ["viaturas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("viaturas")
        .select("*, ocorrencias!viaturas_ocorrencia_id_fkey(id, protocolo, natureza, created_at)")
        .order("prefixo");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("viaturas-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "viaturas" }, () =>
        qc.invalidateQueries({ queryKey: ["viaturas"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  async function patch(id: string, p: Record<string, unknown>) {
    const { error } = await supabase.from("viaturas").update(p as never).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["viaturas"] });
  }

  async function remover(id: string) {
    if (!confirm("Remover esta viatura?")) return;
    const { error } = await supabase.from("viaturas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["viaturas"] });
  }

  const resumo = (Object.keys(VSTATUS) as VStatus[]).map((k) => ({
    k,
    n: data.filter((v) => v.ativa && v.status === k).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs tracking-widest text-muted-foreground">FROTA</div>
          <h1 className="text-2xl font-bold">Viaturas</h1>
        </div>
        {me?.isSupervisor && <NovaViatura />}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {resumo.map((r) => (
          <div key={r.k} className="rounded-md border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${VSTATUS[r.k].dot}`} />
              {VSTATUS[r.k].label}
            </div>
            <div className="font-mono text-2xl font-bold">{r.n}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((v) => {
          const st = v.status as VStatus;
          const oc = v.ocorrencias as { id: string; protocolo: number; natureza: string } | null;
          return (
            <div key={v.id} className={`rounded-md border bg-card p-4 ${!v.ativa ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xl font-bold text-primary">{v.prefixo}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.tipo} · {v.modelo || "—"} · {v.placa || "—"}
                  </div>
                </div>
                <span className={`rounded border px-2 py-0.5 text-xs ${VSTATUS[st].cls}`}>{VSTATUS[st].label}</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Guarnição</Label>
                  <Input
                    defaultValue={v.guarnicao ?? ""}
                    placeholder="Ex: GCM Silva, GCM Souza"
                    onBlur={(e) => e.target.value !== (v.guarnicao ?? "") && patch(v.id, { guarnicao: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <select
                    className={selectCls}
                    value={st}
                    onChange={(e) => {
                      const ns = e.target.value as VStatus;
                      patch(v.id, ns === "disponivel" || ns === "manutencao" || ns === "fora_servico" ? { status: ns, ocorrencia_id: null } : { status: ns });
                    }}
                  >
                    {(Object.keys(VSTATUS) as VStatus[]).map((k) => (
                      <option key={k} value={k} className="bg-popover">{VSTATUS[k].label}</option>
                    ))}
                  </select>
                </div>
                {oc && (
                  <Link to="/ocorrencias/$id" params={{ id: oc.id }} className="block rounded border border-info p-2 text-xs text-info hover:bg-accent">
                    Empenhada: #{oc.protocolo} · {oc.natureza}
                  </Link>
                )}
                {me?.isAdmin && (
                  <div className="flex gap-3 pt-1 text-xs">
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => patch(v.id, { ativa: !v.ativa })}>
                      {v.ativa ? "Desativar" : "Reativar"}
                    </button>
                    <button className="text-destructive hover:underline" onClick={() => remover(v.id)}>Remover</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NovaViatura() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ prefixo: "", placa: "", modelo: "", tipo: "Viatura" });
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("viaturas").insert(f);
    if (error) return void toast.error(error.message);
    toast.success("Viatura cadastrada");
    setF({ prefixo: "", placa: "", modelo: "", tipo: "Viatura" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["viaturas"] });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Nova viatura</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar viatura</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="space-y-3">
          <div className="space-y-1"><Label>Prefixo *</Label><Input required value={f.prefixo} onChange={(e) => setF({ ...f, prefixo: e.target.value })} /></div>
          <div className="space-y-1"><Label>Placa</Label><Input value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} /></div>
          <div className="space-y-1"><Label>Modelo</Label><Input value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <select className={selectCls} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
              {["Viatura", "Motocicleta", "Tático", "Base móvel", "Bicicleta"].map((t) => <option key={t} className="bg-popover">{t}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

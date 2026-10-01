import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, AlertTriangle, Info, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-me";
import { fmtData, selectCls } from "@/lib/cad";

export function QuadroAvisos() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ titulo: "", mensagem: "", nivel: "info" });
  const { data = [] } = useQuery({
    queryKey: ["avisos"],
    queryFn: async () => (await supabase.from("avisos").select("*").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });
  useEffect(() => {
    const ch = supabase.channel("avisos-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "avisos" }, () => qc.invalidateQueries({ queryKey: ["avisos"] }))
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [qc]);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("avisos").insert(f as never);
    if (error) return void toast.error(error.message);
    setF({ titulo: "", mensagem: "", nivel: "info" });
    setNovo(false);
    qc.invalidateQueries({ queryKey: ["avisos"] });
  }
  async function remover(id: string) {
    const { error } = await supabase.from("avisos").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["avisos"] });
  }

  if (!data.length && !me?.isSupervisor) return null;

  return (
    <div className="card-3d animate-rise p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-mono text-xs tracking-widest text-primary"><Megaphone className="h-4 w-4" /> QUADRO DE AVISOS DO PLANTÃO</h2>
        {me?.isSupervisor && <Button size="sm" variant="ghost" onClick={() => setNovo(!novo)}><Plus className="h-3.5 w-3.5" /> Aviso</Button>}
      </div>
      {novo && (
        <form onSubmit={publicar} className="mb-3 grid gap-2 md:grid-cols-[1fr_2fr_auto_auto]">
          <Input required placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
          <Input required placeholder="Mensagem" value={f.mensagem} onChange={(e) => setF({ ...f, mensagem: e.target.value })} />
          <select className={`${selectCls} w-auto`} value={f.nivel} onChange={(e) => setF({ ...f, nivel: e.target.value })}>
            <option value="info" className="bg-popover">Informativo</option>
            <option value="alerta" className="bg-popover">Alerta</option>
          </select>
          <Button type="submit">Publicar</Button>
        </form>
      )}
      {data.length === 0 && <p className="text-xs text-muted-foreground">Nenhum aviso publicado.</p>}
      <div className="space-y-2">
        {data.map((a) => (
          <div key={a.id} className={`flex items-start gap-3 rounded-lg border p-2.5 text-sm ${a.nivel === "alerta" ? "border-destructive/50 bg-destructive/10" : "border-info/40 bg-info/10"}`}>
            {a.nivel === "alerta" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />}
            <div className="flex-1"><b>{a.titulo}</b> — {a.mensagem}<div className="text-[10px] text-muted-foreground">{fmtData(a.created_at)}</div></div>
            {me?.isSupervisor && <button onClick={() => remover(a.id)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power, Search, Shield, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { selectCls } from "@/lib/cad";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe · CAD" }, { name: "description", content: "Cadastro do efetivo de guardas e vigias." }] }),
  component: Equipe,
});

type Membro = {
  id: string;
  nome: string;
  matricula: string | null;
  tipo: "GCM" | "Vigia";
  funcao: string;
  ativo: boolean;
  observacao: string | null;
};

type Form = {
  id?: string;
  nome: string;
  matricula: string;
  tipo: "GCM" | "Vigia";
  funcao: string;
  observacao: string;
};

const vazio: Form = { nome: "", matricula: "", tipo: "GCM", funcao: "Agente", observacao: "" };

function Equipe() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [edit, setEdit] = useState<Form | null>(null);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | "GCM" | "Vigia">("todos");

  const { data = [], isLoading } = useQuery({
    queryKey: ["equipe"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipe").select("*").order("ativo", { ascending: false }).order("nome");
      if (error) throw error;
      return data as Membro[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("equipe-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipe" }, () => qc.invalidateQueries({ queryKey: ["equipe"] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  async function alterarAtivo(m: Membro) {
    const { error } = await supabase.from("equipe").update({ ativo: !m.ativo } as never).eq("id", m.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["equipe"] });
  }

  async function remover(m: Membro) {
    if (!confirm(`Remover ${m.nome} do cadastro de equipe? O histórico dos plantões que já usaram o nome permanece preservado.`)) return;
    const { error } = await supabase.from("equipe").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success("Membro removido"); qc.invalidateQueries({ queryKey: ["equipe"] }); }
  }

  const lista = useMemo(() => data.filter((m) => {
    const texto = `${m.nome} ${m.matricula ?? ""} ${m.funcao}`.toLowerCase();
    return texto.includes(q.toLowerCase()) && (tipo === "todos" || m.tipo === tipo);
  }), [data, q, tipo]);

  const ativos = data.filter((m) => m.ativo).length;
  const guardas = data.filter((m) => m.tipo === "GCM" && m.ativo).length;
  const vigias = data.filter((m) => m.tipo === "Vigia" && m.ativo).length;

  return (
    <div className="space-y-6">
      <PageHeader icon={Shield} asset="police.png" kicker="EFETIVO OPERACIONAL" title="Equipe">
        {me?.isSupervisor && <Button onClick={() => setEdit({ ...vazio })}><img src={`${import.meta.env.BASE_URL}cad-assets/adicionar.gif`} alt="" aria-hidden="true" className="h-5 w-5 object-contain" /> Novo integrante</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total cadastrados" value={data.length} />
        <Stat label="Ativos" value={ativos} />
        <Stat label="Guardas" value={guardas} />
        <Stat label="Vigias" value={vigias} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar nome, matrícula ou função..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={selectCls + " md:w-40"} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="todos" className="bg-popover">Todos</option>
          <option value="GCM" className="bg-popover">Guardas</option>
          <option value="Vigia" className="bg-popover">Vigias</option>
        </select>
      </div>

      {isLoading ? <div className="card-3d p-8 text-center text-muted-foreground">Carregando efetivo...</div> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((m, i) => (
            <div key={m.id} className={`card-3d lift animate-rise p-4 ${!m.ativo ? "opacity-55" : ""}`} style={{ animationDelay: `${i * 35}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="icon-chip h-10 w-10 shrink-0"><UserRound className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{m.nome}</div>
                    <div className="font-mono text-xs text-muted-foreground">{m.matricula || "Sem matrícula"}</div>
                  </div>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">{m.tipo}</span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Função: <span className="text-foreground">{m.funcao}</span></div>
              {m.observacao && <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">{m.observacao}</div>}
              <div className="mt-3 flex items-center gap-1 border-t pt-3">
                <span className={m.ativo ? "text-xs text-success" : "text-xs text-muted-foreground"}>{m.ativo ? "Ativo para escala" : "Inativo"}</span>
                {me?.isSupervisor && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEdit({ id: m.id, nome: m.nome, matricula: m.matricula ?? "", tipo: m.tipo, funcao: m.funcao, observacao: m.observacao ?? "" })}><Pencil className="h-3.5 w-3.5" /> Editar</Button>}
                {me?.isSupervisor && <Button size="sm" variant="ghost" onClick={() => alterarAtivo(m)}><Power className="h-3.5 w-3.5" /> {m.ativo ? "Desativar" : "Ativar"}</Button>}
                {me?.isAdmin && <Button size="sm" variant="ghost" className="text-destructive" aria-label={`Remover ${m.nome}`} onClick={() => remover(m)}><img src={`${import.meta.env.BASE_URL}cad-assets/excluir.gif`} alt="" aria-hidden="true" className="h-6 w-6 object-contain" /></Button>}
              </div>
            </div>
          ))}
          {!lista.length && <div className="card-3d col-span-full p-10 text-center text-muted-foreground">Nenhum integrante encontrado.</div>}
        </div>
      )}

      <EquipeDialog f={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="card-3d p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="font-mono text-2xl font-bold">{value}</div></div>;
}

function EquipeDialog({ f: init, onClose }: { f: Form | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(vazio);
  useEffect(() => { if (init) setF(init); }, [init]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome.trim()) return;
    const payload = { nome: f.nome.trim(), matricula: f.matricula.trim() || null, tipo: f.tipo, funcao: f.funcao.trim() || "Agente", observacao: f.observacao.trim() || null };
    const { error } = f.id
      ? await supabase.from("equipe").update(payload as never).eq("id", f.id)
      : await supabase.from("equipe").insert(payload as never);
    if (error) return void toast.error(error.message);
    toast.success(f.id ? "Integrante atualizado" : "Integrante cadastrado");
    onClose();
    qc.invalidateQueries({ queryKey: ["equipe"] });
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open={!!init} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar integrante" : "Cadastrar integrante"}</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Nome completo *</Label><Input required value={f.nome} onChange={set("nome")} autoFocus /></div>
          <div className="space-y-1"><Label>Matrícula</Label><Input value={f.matricula} onChange={set("matricula")} /></div>
          <div className="space-y-1"><Label>Tipo</Label><select className={selectCls} value={f.tipo} onChange={set("tipo")}><option value="GCM" className="bg-popover">Guarda Civil Municipal</option><option value="Vigia" className="bg-popover">Vigia</option></select></div>
          <div className="col-span-2 space-y-1"><Label>Função</Label><Input value={f.funcao} onChange={set("funcao")} placeholder="Ex.: Encarregado, Condutor, Agente, Vigia" /></div>
          <div className="col-span-2 space-y-1"><Label>Observações</Label><Textarea rows={2} value={f.observacao} onChange={set("observacao")} /></div>
          <Button type="submit" className="col-span-2">Salvar cadastro</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

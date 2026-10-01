import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, ShieldCheck, ShieldHalf, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-me";
import { PageHeader, StatCard } from "@/components/page-header";
import { ROLE_LABEL, fmtData, selectCls } from "@/lib/cad";
import { listarUsuarios, salvarUsuario, excluirUsuario } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · CAD" }, { name: "description", content: "Cadastro de usuários e permissões." }] }),
  component: Usuarios,
});

type Role = "admin" | "supervisor" | "operador";
type Form = { id?: string; email: string; senha: string; nome: string; matricula: string; role: Role };
const vazio: Form = { email: "", senha: "", nome: "", matricula: "", role: "operador" };

const PERMS: Record<Role, string> = {
  operador: "Registra e atende ocorrências, abre e encerra o próprio plantão.",
  supervisor: "Tudo do operador + viaturas, postos, escalas, avisos e edita qualquer ocorrência em andamento.",
  admin: "Acesso total: usuários, exclusões e alteração de plantões já encerrados.",
};

function Usuarios() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const listar = useServerFn(listarUsuarios);
  const excluir = useServerFn(excluirUsuario);
  const [edit, setEdit] = useState<Form | null>(null);
  const { data = [], error } = useQuery({ queryKey: ["usuarios"], enabled: !!me?.isAdmin, queryFn: () => listar() });

  async function remover(id: string, nome: string) {
    if (!confirm(`Excluir o usuário ${nome}? Esta ação não pode ser desfeita.`)) return;
    try { await excluir({ data: { id } }); toast.success("Usuário excluído"); qc.invalidateQueries({ queryKey: ["usuarios"] }); }
    catch (e) { toast.error((e as Error).message); }
  }

  if (!me?.isAdmin) return <div className="text-muted-foreground">Acesso restrito a administradores.</div>;

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} kicker="ADMINISTRAÇÃO" title="Usuários e perfis">
        <Button onClick={() => setEdit({ ...vazio })}><Plus className="h-4 w-4" /> Novo usuário</Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ShieldCheck} label="Administradores" value={data.filter((u) => u.role === "admin").length} tone="text-destructive" />
        <StatCard icon={ShieldHalf} label="Supervisores" value={data.filter((u) => u.role === "supervisor").length} tone="text-warning" delay={60} />
        <StatCard icon={UserCog} label="Operadores" value={data.filter((u) => u.role === "operador").length} tone="text-info" delay={120} />
      </div>

      {error && <div className="text-destructive">{(error as Error).message}</div>}

      <div className="card-3d animate-rise overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Nome</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Matrícula</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Último acesso</th><th /></tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} className="border-b transition last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2 font-medium">{u.nome || "—"}{u.id === me.id && <span className="ml-2 text-xs text-primary">(você)</span>}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2 font-mono">{u.matricula || "—"}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${u.role === "admin" ? "border-destructive text-destructive" : u.role === "supervisor" ? "border-warning text-warning" : "border-info text-info"}`}>{ROLE_LABEL[u.role]}</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{fmtData(u.ultimo_acesso)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ id: u.id, email: u.email, senha: "", nome: u.nome, matricula: u.matricula, role: u.role })}><Pencil className="h-3.5 w-3.5" /></Button>
                  {u.id !== me.id && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remover(u.id, u.nome || u.email)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UsuarioDialog f={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function UsuarioDialog({ f: init, onClose }: { f: Form | null; onClose: () => void }) {
  const qc = useQueryClient();
  const salvar = useServerFn(salvarUsuario);
  const [f, setF] = useState<Form>(vazio);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (init) setF(init); }, [init]);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await salvar({ data: f });
      toast.success(f.id ? "Usuário atualizado" : "Usuário cadastrado");
      onClose();
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={!!init} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{f.id ? "Editar usuário" : "Novo usuário"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Nome completo *</Label><Input required value={f.nome} onChange={set("nome")} /></div>
          <div className="space-y-1"><Label>E-mail *</Label><Input type="email" required value={f.email} onChange={set("email")} /></div>
          <div className="space-y-1"><Label>Matrícula</Label><Input value={f.matricula} onChange={set("matricula")} /></div>
          <div className="col-span-2 space-y-1"><Label>{f.id ? "Nova senha (deixe em branco para manter)" : "Senha *"}</Label><Input type="password" minLength={6} required={!f.id} value={f.senha} onChange={set("senha")} /></div>
          <div className="col-span-2 space-y-1">
            <Label>Perfil de acesso</Label>
            <select className={selectCls} value={f.role} onChange={set("role")}>
              {(["operador", "supervisor", "admin"] as Role[]).map((r) => <option key={r} value={r} className="bg-popover">{ROLE_LABEL[r]}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">{PERMS[f.role]}</p>
          </div>
          <Button type="submit" disabled={busy} className="col-span-2">{busy ? "Salvando..." : "Salvar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

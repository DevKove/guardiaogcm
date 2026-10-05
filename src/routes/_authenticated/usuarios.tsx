import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Pencil, ShieldCheck, ShieldHalf, UserCog, UserCheck, Clock3, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-me";
import { PageHeader, StatCard } from "@/components/page-header";
import { ROLE_LABEL, fmtData, selectCls } from "@/lib/cad";
import { listarUsuarios, salvarUsuario, excluirUsuario, aprovarUsuario, criarUsuarioTestePendente } from "@/lib/usuarios.api";

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
  const [edit, setEdit] = useState<Form | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const { data = [], error } = useQuery({ queryKey: ["usuarios"], enabled: !!me?.isAdmin, queryFn: listarUsuarios });

  async function aprovar(id: string, nome: string) {
    if (!confirm(`Aprovar o acesso de ${nome}?`)) return;
    try {
      await aprovarUsuario(id);
      toast.success("Usuário aprovado como operador");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remover(id: string, nome: string) {
    if (!confirm(`Excluir o usuário ${nome}? Esta ação não pode ser desfeita.`)) return;
    try { await excluirUsuario(id); toast.success("Usuário excluído"); qc.invalidateQueries({ queryKey: ["usuarios"] }); }
    catch (e) { toast.error((e as Error).message); }
  }

  if (!me?.isAdmin) return <div className="text-muted-foreground">Acesso restrito a administradores.</div>;

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} asset="escaneamento-de-rosto.gif" kicker="ADMINISTRAÇÃO" title="Usuários e perfis">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTestOpen(true)}><FlaskConical className="mr-2 h-4 w-4" /> Usuário de teste</Button>
          <Button onClick={() => setEdit({ ...vazio })}><img src={`${import.meta.env.BASE_URL}cad-assets/adicionar.gif`} alt="" aria-hidden="true" className="h-5 w-5 object-contain" /> Novo usuário</Button>
        </div>
      </PageHeader>

      {data.some((u) => !u.aprovado) && (
        <div className="card-3d border border-warning/30 bg-warning/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-warning">
            <Clock3 className="h-5 w-5" />
            <div>
              <div className="font-semibold">Cadastros aguardando aprovação</div>
              <div className="text-xs text-muted-foreground">Revise e autorize os novos usuários antes de liberar o acesso operacional.</div>
            </div>
          </div>
          <div className="space-y-2">
            {data.filter((u) => !u.aprovado).map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 border border-border/60 bg-background/40 p-3">
                <div>
                  <div className="font-semibold">{u.nome || "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}{u.matricula ? ` · Matrícula ${u.matricula}` : ""}</div>
                </div>
                <Button size="sm" onClick={() => aprovar(u.id, u.nome || u.email)}>
                  <UserCheck className="mr-2 h-4 w-4" /> Aprovar acesso
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${!u.aprovado ? "border-warning text-warning" : u.role === "admin" ? "border-destructive text-destructive" : u.role === "supervisor" ? "border-warning text-warning" : "border-info text-info"}`}>{!u.aprovado ? "Pendente" : u.role ? ROLE_LABEL[u.role] : "Sem perfil"}</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{fmtData(u.ultimo_acesso)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {u.aprovado && u.role && <Button size="sm" variant="ghost" onClick={() => setEdit({ id: u.id, email: u.email, senha: "", nome: u.nome, matricula: u.matricula, role: u.role as Role })}><Pencil className="h-3.5 w-3.5" /></Button>}
                  {u.id !== me.id && <Button size="sm" variant="ghost" className="text-destructive" aria-label={`Excluir usuário ${u.nome || u.email}`} onClick={() => remover(u.id, u.nome || u.email)}><img src={`${import.meta.env.BASE_URL}cad-assets/excluir.gif`} alt="" aria-hidden="true" className="h-6 w-6 object-contain" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UsuarioDialog f={edit} onClose={() => setEdit(null)} />
      <TestePendenteDialog open={testOpen} onClose={() => setTestOpen(false)} />
    </div>
  );
}

function TestePendenteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ email: "", senha: "", nome: "Usuário de teste", matricula: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setF({ email: "", senha: "", nome: "Usuário de teste", matricula: "" });
  }, [open]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await criarUsuarioTestePendente(f);
      toast.success("Usuário de teste criado como pendente");
      onClose();
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-warning" /> Usuário de teste administrativo</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
          Cria uma conta confirmada no Auth, mas <strong className="text-foreground">sem aprovação e sem perfil operacional</strong>. Nenhum e-mail é enviado. Use este modo para testar o fluxo de aprovação.
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Nome completo *</Label><Input required maxLength={120} value={f.nome} onChange={set("nome")} /></div>
          <div className="space-y-1"><Label>E-mail *</Label><Input type="email" required value={f.email} onChange={set("email")} /></div>
          <div className="space-y-1"><Label>Matrícula</Label><Input maxLength={40} value={f.matricula} onChange={set("matricula")} /></div>
          <div className="col-span-2 space-y-1"><Label>Senha *</Label><Input type="password" minLength={12} maxLength={72} required value={f.senha} onChange={set("senha")} /></div>
          <Button type="submit" disabled={busy} className="col-span-2">{busy ? "Criando..." : "Criar pendente"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsuarioDialog({ f: init, onClose }: { f: Form | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(vazio);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (init) setF(init); }, [init]);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await salvarUsuario(f);
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
          <div className="col-span-2 space-y-1"><Label>{f.id ? "Nova senha (deixe em branco para manter)" : "Senha *"}</Label><Input type="password" minLength={12} maxLength={72} required={!f.id} value={f.senha} onChange={set("senha")} /></div>
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

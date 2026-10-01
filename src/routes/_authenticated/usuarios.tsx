import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { ROLE_LABEL } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · CAD" }] }),
  component: Usuarios,
});

type Role = "admin" | "supervisor" | "operador";

function Usuarios() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["usuarios"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profs ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role as Role | undefined,
      }));
    },
  });

  async function setRole(userId: string, role: Role) {
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) {
      toast.error(del.error.message);
      return;
    }
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (ins.error) {
      toast.error(ins.error.message);
      return;
    }
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["usuarios"] });
  }

  if (!me?.isAdmin) return <div className="text-muted-foreground">Acesso restrito a administradores.</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-xs tracking-widest text-muted-foreground">ADMINISTRAÇÃO</div>
        <h1 className="text-2xl font-bold">Usuários e perfis</h1>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Matrícula</th><th className="px-3 py-2">Perfil</th></tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">{u.nome || "—"}</td>
                <td className="px-3 py-2 font-mono">{u.matricula || "—"}</td>
                <td className="px-3 py-2">
                  <select
                    disabled={u.id === me.id}
                    value={u.role ?? ""}
                    onChange={(e) => setRole(u.id, e.target.value as Role)}
                    className="rounded border border-input bg-transparent px-2 py-1"
                  >
                    {(["operador", "supervisor", "admin"] as Role[]).map((r) => (
                      <option key={r} value={r} className="bg-popover">{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

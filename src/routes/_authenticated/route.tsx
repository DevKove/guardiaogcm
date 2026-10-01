import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, LogOut, LayoutList, PlusCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { ROLE_LABEL } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls =
    "flex items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground";
  const activeCls = "bg-accent text-foreground";

  return (
    <div className="min-h-screen">
      <div className="stripe-top h-1" />
      <header className="border-b bg-sidebar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/painel" className="flex items-center gap-2 text-primary">
            <Shield className="h-6 w-6" />
            <span className="font-mono text-sm font-bold tracking-widest">CAD·GM</span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            <Link to="/painel" className={linkCls} activeProps={{ className: activeCls }}>
              <LayoutList className="h-4 w-4" /> Ocorrências
            </Link>
            <Link to="/ocorrencias/nova" className={linkCls} activeProps={{ className: activeCls }}>
              <PlusCircle className="h-4 w-4" /> Nova ocorrência
            </Link>
            {me?.isAdmin && (
              <Link to="/usuarios" className={linkCls} activeProps={{ className: activeCls }}>
                <Users className="h-4 w-4" /> Usuários
              </Link>
            )}
          </nav>
          <div className="text-right text-xs">
            <div className="font-medium">{me?.nome}</div>
            <div className="text-muted-foreground">
              {me?.roles.map((r) => ROLE_LABEL[r]).join(", ") || "Sem perfil"}
            </div>
          </div>
          <button onClick={signOut} className={linkCls} title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

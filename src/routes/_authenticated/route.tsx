import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shield, LogOut, LayoutList, PlusCircle, Users, Car, BarChart3, UserCircle, School, CalendarClock } from "lucide-react";
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

function Relogio() {
  const [d, setD] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setD(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden text-right font-mono leading-tight lg:block">
      <div className="text-sm font-bold text-primary">{d.toLocaleTimeString("pt-BR")}</div>
      <div className="text-[10px] text-muted-foreground">{d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</div>
    </div>
  );
}

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
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:-translate-y-0.5";
  const activeCls = "!bg-primary/15 !text-primary shadow-[inset_0_-2px_0_var(--primary)]";

  const items = [
    { to: "/painel", icon: LayoutList, label: "Ocorrências" },
    { to: "/ocorrencias/nova", icon: PlusCircle, label: "Nova" },
    { to: "/viaturas", icon: Car, label: "Viaturas" },
    { to: "/postos", icon: School, label: "Postos fixos" },
    { to: "/escalas", icon: CalendarClock, label: "Escalas" },
    { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
  ] as const;

  return (
    <div className="min-h-screen">
      <div className="stripe-top h-1 print:hidden" />
      <header className="glass sticky top-0 z-40 border-b print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-2.5">
          <Link to="/painel" className="flex items-center gap-2">
            <div className="bg-gradient-primary flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-mono text-sm font-bold tracking-widest text-primary">CAD·GM</div>
              <div className="text-[10px] text-muted-foreground">Guarda Municipal</div>
            </div>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {items.map((i) => (
              <Link key={i.to} to={i.to} className={linkCls} activeProps={{ className: activeCls }}>
                <i.icon className="h-4 w-4" /> {i.label}
              </Link>
            ))}
            {me?.isAdmin && (
              <Link to="/usuarios" className={linkCls} activeProps={{ className: activeCls }}>
                <Users className="h-4 w-4" /> Usuários
              </Link>
            )}
          </nav>
          <Relogio />
          <Link to="/perfil" className="flex items-center gap-2 rounded-lg px-2 py-1 text-right text-xs transition hover:bg-accent" title="Meu perfil">
            <UserCircle className="h-6 w-6 text-primary" />
            <div>
              <div className="font-medium">{me?.nome}</div>
              <div className="text-muted-foreground">{me?.roles.map((r) => ROLE_LABEL[r]).join(", ") || "Sem perfil"}</div>
            </div>
          </Link>
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

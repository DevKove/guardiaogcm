import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shield, LogOut, LayoutList, PlusCircle, Users, Car, BarChart3, UserCircle, School, CalendarClock, History, PlayCircle, Palette } from "lucide-react";
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
    <div className="hidden border-l pl-4 text-right leading-tight lg:block">
      <div className="font-mono text-sm font-semibold tracking-tight text-foreground">
        {d.toLocaleTimeString("pt-BR")}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
      </div>
    </div>
  );
}

function Layout() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [theme, setTheme] = useState("escuro");

  useEffect(() => {
    const saved = window.localStorage.getItem("cad-theme");
    const validThemes = ["claro", "escuro", "cyberpunk", "oceano", "floresta"];
    const initial = saved && validThemes.includes(saved) ? saved : "escuro";
    setTheme(initial);
    document.documentElement.dataset["theme"] = initial;
  }, []);

  function changeTheme(value: string) {
    setTheme(value);
    document.documentElement.dataset["theme"] = value;
    window.localStorage.setItem("cad-theme", value);
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls =
    "inline-flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground";
  const activeCls =
    "!border-primary/25 !bg-primary/10 !text-primary";

  const items = [
    { to: "/painel", icon: LayoutList, label: "Ocorrências" },
    { to: "/ocorrencias/nova", icon: PlusCircle, label: "Nova" },
    { to: "/viaturas", icon: Car, label: "Viaturas" },
    { to: "/equipe", icon: Users, label: "Equipe" },
    { to: "/postos", icon: School, label: "Próprios públicos" },
    { to: "/escalas", icon: CalendarClock, label: "Posto fixo" },
    { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
    { to: "/historico", icon: History, label: "Histórico" },
    { to: "/plantao", icon: PlayCircle, label: "Plantão" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="siren-bar print:hidden" />

      <header className="glass sticky top-0 z-40 border-b border-border/90 print:hidden">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2 lg:px-6">
          <Link
            to="/painel"
            className="col-start-1 row-start-1 mr-2 flex min-w-0 items-center gap-3 rounded-md py-1.5 pr-2 transition-colors hover:bg-accent/60"
            aria-label="CAD Guarda Municipal"
          >
            <div className="icon-chip h-9 w-9 shrink-0">
              <Shield className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </div>
            <div className="hidden leading-none sm:block">
              <div className="text-[15px] font-bold tracking-tight text-foreground">CAD Guarda Municipal</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Central de Atendimento e Despacho
              </div>
            </div>
          </Link>

          <nav className="col-span-2 row-start-2 flex w-full flex-wrap items-center gap-1 overflow-visible border-t border-border/70 pt-2" aria-label="Navegação principal">
            {items.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                className={linkCls}
                activeProps={{ className: activeCls }}
              >
                <i.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                <span className="whitespace-nowrap">{i.label}</span>
              </Link>
            ))}
            {me?.isAdmin && (
              <Link to="/usuarios" className={linkCls} activeProps={{ className: activeCls }}>
                <Users className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                <span>Usuários</span>
              </Link>
            )}
          </nav>

          <div className="col-start-2 row-start-1 ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <label className="flex h-9 items-center gap-1.5 rounded-md border border-border px-2 text-muted-foreground" title="Personalizar aparência">
              <Palette className="h-4 w-4 shrink-0" />
              <select
                aria-label="Tema visual"
                value={theme}
                onChange={(e) => changeTheme(e.target.value)}
                className="max-w-[100px] bg-transparent text-xs text-foreground outline-none sm:max-w-[120px]"
              >
                <option value="escuro">Escuro</option>
                <option value="claro">Claro</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="oceano">Oceano</option>
                <option value="floresta">Floresta</option>
              </select>
            </label>
            <Relogio />
            <Link
              to="/perfil"
              className="hidden items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-right transition-colors hover:border-border hover:bg-accent sm:flex"
              title="Meu perfil"
            >
              <UserCircle className="h-6 w-6 text-primary" strokeWidth={1.8} />
              <div className="max-w-32 leading-tight">
                <div className="truncate text-xs font-semibold text-foreground">{me?.nome}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {me?.roles.map((r) => ROLE_LABEL[r]).join(", ") || "Sem perfil"}
                </div>
              </div>
            </Link>
            <button
              onClick={signOut}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6 lg:py-7">
        <Outlet />
      </main>
    </div>
  );
}

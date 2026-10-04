import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Shield, LogOut, LayoutList, PlusCircle, Users, Car, BarChart3, UserCircle, School, History, PlayCircle, Palette, Check, ChevronDown } from "lucide-react";
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
  const [themeOpen, setThemeOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

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
    setThemeOpen(false);
  }

  useEffect(() => {
    if (!themeOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [themeOpen]);

  const themes = [
    { value: "escuro", label: "Escuro", description: "Baixa luminosidade" },
    { value: "claro", label: "Claro", description: "Alta luminosidade" },
    { value: "cyberpunk", label: "Cyberpunk", description: "Neon e alto contraste" },
    { value: "oceano", label: "Oceano", description: "Azul profundo" },
    { value: "floresta", label: "Floresta", description: "Verde operacional" },
  ] as const;

  const selectedTheme = themes.find((item) => item.value === theme) ?? themes[0];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls =
    "inline-flex items-center gap-2 border border-transparent px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-cyan-300";
  const activeCls =
    "!border-cyan-400/35 !bg-cyan-400/10 !text-cyan-300";

  const items = [
    { to: "/painel", icon: LayoutList, label: "Ocorrências" },
    { to: "/ocorrencias/nova", icon: PlusCircle, label: "Nova" },
    { to: "/viaturas", icon: Car, label: "Viaturas" },
    { to: "/equipe", icon: Users, label: "Equipe" },
    { to: "/postos", icon: School, label: "Postos fixos" },
    { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
    { to: "/historico", icon: History, label: "Histórico" },
    { to: "/plantao", icon: PlayCircle, label: "Plantão" },
  ] as const;

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="siren-bar print:hidden" />

      <header className="sticky top-0 z-40 border-b border-cyan-400/20 bg-[#05090e] print:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-3 px-3 py-3 sm:px-4 lg:px-6">
          <Link
            to="/painel"
            className="group flex min-w-0 flex-1 basis-[280px] items-center border-l-2 border-cyan-400/70 py-1.5 pl-3 pr-2 transition-colors"
            aria-label="CAD Guarda Municipal"
          >
            <span className="min-w-0">
              <span className="block truncate font-sans text-lg font-black leading-none tracking-[0.08em] text-foreground sm:text-xl lg:text-2xl">
                CAD <span className="font-semibold tracking-[0.04em] text-primary">GUARDA MUNICIPAL</span>
              </span>
              <span className="mt-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.22em]">
                Atendimento <span className="px-1 text-primary/70">/</span> Despacho <span className="px-1 text-primary/70">/</span> Gestão de ocorrências
              </span>
              <span className="mt-1.5 block text-[10px] font-medium tracking-wide text-muted-foreground">
                ARAÇOIABA DA SERRA <span className="px-1 text-primary">·</span> SP
              </span>
            </span>
          </Link>

          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div ref={themeMenuRef} className="relative">
              <button
                type="button"
                aria-label="Tema visual"
                aria-haspopup="menu"
                aria-expanded={themeOpen}
                onClick={() => setThemeOpen((open) => !open)}
                className="inline-flex h-9 min-w-[142px] items-center justify-between gap-2 rounded-md border border-border bg-background/80 px-2.5 text-left text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                title="Personalizar aparência"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Palette className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{selectedTheme.label}</span>
                    <span className="hidden text-[9px] leading-none text-muted-foreground sm:block">{selectedTheme.description}</span>
                  </span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${themeOpen ? "rotate-180" : ""}`} />
              </button>

              {themeOpen && (
                <div
                  role="menu"
                  aria-label="Selecionar tema"
                  className="absolute right-0 top-[calc(100%+0.45rem)] z-[100] w-64 overflow-hidden rounded-lg border p-1.5 shadow-2xl ring-1 ring-black/30 animate-rise"
                  style={{ backgroundColor: "#020617", color: "#ffffff", borderColor: "#475569", boxShadow: "0 20px 40px rgba(0,0,0,.45)" }}
                >
                  <div className="border-b px-2.5 py-2" style={{ borderColor: "#334155" }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#cbd5e1" }}>Tema visual</div>
                    <div className="mt-0.5 text-[11px]" style={{ color: "#94a3b8" }}>Escolha a aparência do CAD</div>
                  </div>
                  <div className="pt-1">
                    {themes.map((item) => {
                      const active = theme === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => changeTheme(item.value)}
                          className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${active ? "ring-1 ring-primary/40" : ""}`}
                          style={{ backgroundColor: active ? "rgba(59,130,246,.20)" : "transparent", color: "#ffffff" }}
                          onMouseEnter={(event) => { if (!active) event.currentTarget.style.backgroundColor = "rgba(255,255,255,.10)"; }}
                          onMouseLeave={(event) => { if (!active) event.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                            style={{ borderColor: active ? "rgba(96,165,250,.70)" : "#475569", backgroundColor: active ? "rgba(59,130,246,.18)" : "#0f172a", color: active ? "#60a5fa" : "#cbd5e1" }}>
                            <Palette className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold" style={{ color: "#ffffff" }}>{item.label}</span>
                            <span className="block truncate text-[10px]" style={{ color: "#94a3b8" }}>{item.description}</span>
                          </span>
                          {active && <Check className="h-4 w-4 shrink-0" style={{ color: "#60a5fa" }} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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

          <nav className="flex w-full basis-full flex-wrap items-center gap-1 border-t border-slate-800 pt-2" aria-label="Navegação principal">
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
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5 lg:px-6 lg:py-6">
        <Outlet />
      </main>
    </div>
  );
}

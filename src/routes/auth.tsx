import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · CAD Guarda Municipal" },
      { name: "description", content: "Acesso restrito ao sistema CAD da Guarda Municipal." },
      { property: "og:title", content: "Entrar · CAD Guarda Municipal" },
      { property: "og:description", content: "Acesso restrito ao sistema CAD da Guarda Municipal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  // Build refresh: the login header intentionally contains no animated GIFs.
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      navigate({ to: "/painel" });
    } catch {
      toast.error("Não foi possível autenticar. Confira os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cad-auth-shell min-h-screen text-slate-100">
      <div className="h-0.5 bg-cyan-400" />
      <header className="border-b border-cyan-400/20 bg-[#05090e] px-4 py-5">
        <div className="mx-auto max-w-5xl border-l-2 border-cyan-400/70 pl-3">
          <div className="flex items-center gap-2 text-cyan-300">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">CAD GUARDA MUNICIPAL</span>
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">Atendimento / Despacho / Gestão de ocorrências</div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-105px)] items-center justify-center px-4 py-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 border border-slate-800 bg-[#070d13] p-6 shadow-none">
          <div className="mb-4 flex items-center gap-3 border-b border-cyan-400/20 pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-cyan-400/25">
              <Shield className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-cyan-300">
                <Shield className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Acesso operacional</span>
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Central de Atendimento e Despacho</div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Entrar</h1>
          <p className="text-sm text-muted-foreground">Acesso exclusivo a usuários autorizados pela administração.</p>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input type="email" autoComplete="username" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Senha</Label>
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Autenticando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

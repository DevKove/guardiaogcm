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
      // Keep authentication failures generic to avoid exposing account state or provider details.
      toast.error("Não foi possível autenticar. Confira os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="stripe-top h-2" />
      <div className="flex flex-1 items-center justify-center px-4">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-md border bg-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-6 w-6" />
            <span className="font-mono text-xs tracking-widest">CAD · GUARDA MUNICIPAL</span>
          </div>
          <h1 className="text-2xl font-bold">Entrar</h1>
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

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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/painel" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/painel", data: { nome, matricula } },
        });
        if (error) throw error;
        toast.success("Cadastro realizado. Confirme pelo link enviado ao seu e-mail.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
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
          <h1 className="text-2xl font-bold">{mode === "login" ? "Entrar" : "Solicitar acesso"}</h1>
          {mode === "signup" && (
            <>
              <div className="space-y-1">
                <Label>Nome completo</Label>
                <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Matrícula</Label>
                <Input value={matricula} onChange={(e) => setMatricula(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Senha</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Não tem conta? Solicitar acesso" : "Já tenho conta"}
          </button>
        </form>
      </div>
    </div>
  );
}

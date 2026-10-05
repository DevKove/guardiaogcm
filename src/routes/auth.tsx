import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, UserPlus, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso · CAD Guarda Municipal" },
      { name: "description", content: "Acesso restrito ao sistema CAD da Guarda Municipal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return;
    const { data: profile } = await supabase.from("profiles").select("aprovado").eq("id", data.session.user.id).maybeSingle();
    if (profile?.aprovado) navigate({ to: "/painel", replace: true });
    else setPending(true);
  }

  useEffect(() => {
    void checkSession();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "cadastro") {
        const cleanEmail = email.trim().toLowerCase();
        const cleanNome = nome.trim();
        const cleanMatricula = matricula.trim();

        if (cleanNome.length < 3 || cleanNome.length > 120) throw new Error("Informe seu nome completo.");
        if (cleanMatricula.length > 40) throw new Error("Matrícula inválida.");
        if (password.length < 12 || password.length > 72) throw new Error("A senha deve ter entre 12 e 72 caracteres.");

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("Não foi possível criar a conta.");

        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          nome: cleanNome,
          matricula: cleanMatricula || null,
          aprovado: false,
        });
        if (profileError) {
          await supabase.auth.signOut();
          throw new Error("Não foi possível concluir o cadastro. Tente novamente.");
        }

        setPending(true);
        toast.success("Cadastro enviado para aprovação.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("aprovado").eq("id", userData.user?.id ?? "").maybeSingle();
      if (!profile?.aprovado) {
        setPending(true);
        return;
      }
      navigate({ to: "/painel", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    } finally {
      setLoading(false);
    }
  }

  async function sairDaConta() {
    await supabase.auth.signOut();
    setPending(false);
    setMode("login");
    setEmail("");
    setPassword("");
  }

  if (pending) {
    return (
      <div className="cad-auth-shell min-h-screen text-slate-100">
        <div className="h-0.5 bg-cyan-400" />
        <header className="border-b border-cyan-400/20 bg-[#05090e] px-4 py-5">
          <div className="mx-auto max-w-5xl border-l-2 border-cyan-400/70 pl-3">
            <div className="flex items-center gap-2 text-cyan-300">
              <Shield className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">CAD GUARDA MUNICIPAL</span>
            </div>
          </div>
        </header>
        <div className="flex min-h-[calc(100vh-105px)] items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-5 border border-cyan-400/20 bg-[#070d13] p-7 text-center shadow-none">
            <Clock3 className="mx-auto h-12 w-12 text-cyan-300" />
            <h1 className="text-2xl font-bold text-white">Cadastro aguardando aprovação</h1>
            <p className="text-sm leading-6 text-slate-400">
              Seu cadastro foi recebido. Um administrador do CAD precisa aprovar seu acesso antes que você possa entrar no sistema.
            </p>
            <p className="text-xs text-slate-500">Após a aprovação, use seu e-mail e senha para acessar normalmente.</p>
            <Button type="button" variant="outline" className="w-full" onClick={sairDaConta}>Voltar para o acesso</Button>
          </div>
        </div>
      </div>
    );
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
              {mode === "login" ? <Shield className="h-6 w-6 text-cyan-300" /> : <UserPlus className="h-6 w-6 text-cyan-300" />}
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                {mode === "login" ? "Acesso operacional" : "Novo cadastro"}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Central de Atendimento e Despacho</div>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">{mode === "login" ? "Entrar" : "Criar cadastro"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Acesso exclusivo a usuários aprovados pela administração." : "Seu acesso ficará pendente até a aprovação de um administrador."}
            </p>
          </div>

          {mode === "cadastro" && (
            <>
              <div className="space-y-1"><Label>Nome completo *</Label><Input required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div className="space-y-1"><Label>Matrícula</Label><Input maxLength={40} value={matricula} onChange={(e) => setMatricula(e.target.value)} /></div>
            </>
          )}

          <div className="space-y-1">
            <Label>E-mail *</Label>
            <Input type="email" autoComplete="username" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Senha *</Label>
            <Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={12} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "cadastro" && <p className="text-[11px] text-slate-500">Use uma senha com pelo menos 12 caracteres.</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (mode === "login" ? "Autenticando..." : "Enviando cadastro...") : (mode === "login" ? "Entrar" : "Enviar cadastro")}
          </Button>

          <button type="button" className="w-full text-center text-xs font-semibold text-cyan-300 hover:text-cyan-200" onClick={() => setMode(mode === "login" ? "cadastro" : "login")}>
            {mode === "login" ? "Ainda não possui acesso? Solicitar cadastro" : "Já possui cadastro? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

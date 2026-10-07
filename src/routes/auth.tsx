import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, UserPlus, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LegalFooter } from "@/components/legal-footer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);

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
        if (!aceitouTermos) throw new Error("É necessário aceitar os Termos de Uso e a Política de Privacidade para criar o cadastro.");

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              nome: cleanNome,
              matricula: cleanMatricula,
              termos_uso_aceitos: true,
              politica_privacidade_aceita: true,
              termos_aceitos_em: new Date().toISOString(),
              versao_termos_aceita: "2026-10-07",
            },
          },
        });
        if (error) throw error;
        if (!data.user) throw new Error("Não foi possível criar a conta.");

        setPending(true);
        toast.success("Cadastro enviado para aprovação.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        const msg = `${error.message ?? ""}`.toLowerCase();
        const code = String(error.code ?? "").toLowerCase();
        const emailNaoConfirmadoNoAuth =
          code === "email_not_confirmed" ||
          code === "email_not_verified" ||
          Number(error.status) === 400 && msg.includes("confirm") ||
          msg.includes("email not confirmed") ||
          msg.includes("email is not confirmed") ||
          msg.includes("e-mail não confirmado") ||
          msg.includes("email nao confirmado");
        if (emailNaoConfirmadoNoAuth) {
          setEmailNaoConfirmado(true);
          return;
        }
        throw error;
      }

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

  async function reenviarConfirmacao() {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Informe seu e-mail para reenviar a confirmação.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
      });
      if (error) throw error;
      toast.success("Novo e-mail de confirmação enviado. Verifique também o Spam e o Lixo eletrônico.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reenviar o e-mail de confirmação.");
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
    setAceitouTermos(false);
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
        <LegalFooter />
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

          {mode === "cadastro" && (
            <div className="rounded-md border border-cyan-400/20 bg-cyan-400/5 p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="aceite-termos"
                  checked={aceitouTermos}
                  onCheckedChange={(checked) => setAceitouTermos(checked === true)}
                  disabled={loading}
                  aria-required="true"
                />
                <Label htmlFor="aceite-termos" className="cursor-pointer text-xs font-normal leading-5 text-slate-300">
                  Declaro que li e aceito os{" "}
                  <Link to="/termos-de-uso" className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link to="/politica-de-privacidade" className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                    Política de Privacidade
                  </Link>{" "}
                  do Guardião GCM.
                </Label>
              </div>
              <p className="mt-2 pl-7 text-[10px] leading-4 text-slate-500">
                O cadastro somente poderá ser enviado após a marcação deste aceite.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (mode === "login" ? "Autenticando..." : "Enviando cadastro...") : (mode === "login" ? "Entrar" : "Enviar cadastro")}
          </Button>

          <button type="button" className="w-full text-center text-xs font-semibold text-cyan-300 hover:text-cyan-200" onClick={() => { setMode(mode === "login" ? "cadastro" : "login"); if (mode === "cadastro") setAceitouTermos(false); }}>
            {mode === "login" ? "Ainda não possui acesso? Solicitar cadastro" : "Já possui cadastro? Entrar"}
          </button>
        </form>
      </div>

      {emailNaoConfirmado && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-nao-confirmado-titulo"
        >
          <div className="w-full max-w-lg rounded-lg border border-cyan-400/25 bg-[#070d13] p-6 text-slate-100 shadow-2xl">
            <div className="border-b border-cyan-400/20 pb-4">
              <h2 id="email-nao-confirmado-titulo" className="text-xl font-semibold text-white">E-mail ainda não confirmado</h2>
              <p className="mt-2 text-sm leading-5 text-slate-400">
                Para entrar no Guardião GCM, primeiro confirme o endereço de e-mail usado no cadastro.
              </p>
            </div>
            <div className="space-y-4 py-4">
              <div className="rounded-md border border-cyan-400/20 bg-cyan-400/5 p-4">
                <p className="text-sm font-semibold text-cyan-200">Como confirmar seu acesso</p>
                <ol className="mt-3 space-y-2 text-sm leading-5 text-slate-300">
                  <li><span className="font-semibold text-cyan-300">1.</span> Abra a caixa de entrada do e-mail cadastrado.</li>
                  <li><span className="font-semibold text-cyan-300">2.</span> Procure a mensagem de confirmação do Guardião GCM.</li>
                  <li><span className="font-semibold text-cyan-300">3.</span> Abra a mensagem e clique no botão ou link de confirmação.</li>
                  <li><span className="font-semibold text-cyan-300">4.</span> Depois da confirmação, volte ao sistema e faça o login novamente.</li>
                </ol>
              </div>
              <div className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-slate-400">
                <span className="font-semibold text-amber-200">Não encontrou o e-mail?</span> Verifique também Spam, Lixo eletrônico, Promoções e Outras caixas. Se ainda não estiver lá, use o botão abaixo para solicitar um novo envio.
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setEmailNaoConfirmado(false)} disabled={loading}>Entendi</Button>
              <Button type="button" onClick={() => void reenviarConfirmacao()} disabled={loading}>
                {loading ? "Enviando..." : "Reenviar confirmação"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil · CAD" }] }),
  component: Perfil,
});

function Perfil() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");

  useEffect(() => {
    if (me) {
      setNome(me.nome);
      setMatricula(me.matricula ?? "");
    }
  }, [me]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ nome, matricula }).eq("id", me!.id);
    if (error) return void toast.error(error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: nova, current_password: atual } as never);
    if (error) return void toast.error(error.message);
    toast.success("Senha alterada");
    setAtual("");
    setNova("");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="font-mono text-xs tracking-widest text-muted-foreground">CONTA</div>
        <h1 className="text-2xl font-bold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          {me?.email} · Operador do CAD
        </p>
      </div>
      <form onSubmit={salvar} className="space-y-3 card-3d animate-rise p-5">
        <div className="space-y-1"><Label>Nome</Label><Input required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="space-y-1"><Label>Matrícula</Label><Input value={matricula} onChange={(e) => setMatricula(e.target.value)} /></div>
        <Button type="submit">Salvar</Button>
      </form>
      <form onSubmit={trocarSenha} className="space-y-3 card-3d animate-rise p-5">
        <h2 className="font-semibold text-primary">Alterar senha</h2>
        <div className="space-y-1"><Label>Senha atual</Label><Input type="password" required value={atual} onChange={(e) => setAtual(e.target.value)} /></div>
        <div className="space-y-1"><Label>Nova senha</Label><Input type="password" required minLength={6} value={nova} onChange={(e) => setNova(e.target.value)} /></div>
        <Button type="submit" variant="secondary">Alterar senha</Button>
      </form>
    </div>
  );
}

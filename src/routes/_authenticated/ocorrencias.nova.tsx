import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NATUREZAS, ORIGENS, PRIORIDADES, selectCls } from "@/lib/cad";

export const Route = createFileRoute("/_authenticated/ocorrencias/nova")({
  head: () => ({ meta: [{ title: "Nova ocorrência · CAD" }] }),
  component: Nova,
});

function Nova() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const { data: plantao, isLoading: carregandoPlantao } = useQuery({
    queryKey: ["plantao-atual"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plantoes")
        .select("id, turno, data_inicio, operador_id")
        .eq("status", "aberto")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const [f, setF] = useState({
    natureza: NATUREZAS[0] as string,
    prioridade: 3,
    origem: "153",
    numero: "",
    solicitante_nome: "",
    solicitante_telefone: "",
    endereco: "",
    bairro: "",
    referencia: "",
    relato: "",
  });

  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!plantao) {
      toast.error("Não há plantão aberto. Inicie um plantão antes de registrar uma ocorrência.");
      return;
    }

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();

    if (!u.user) {
      setSaving(false);
      toast.error("Sessão expirada. Faça login novamente.");
      navigate({ to: "/auth" });
      return;
    }

    const { data, error } = await supabase
      .from("ocorrencias")
      .insert({
        ...f,
        criado_por: u.user.id,
        plantao_id: plantao.id,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      toast.error("Erro ao registrar ocorrência: " + error.message);
      return;
    }

    toast.success("Ocorrência registrada");
    navigate({ to: "/ocorrencias/$id", params: { id: data.id } });
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="font-mono text-xs tracking-widest text-muted-foreground">REGISTRO</div>
        <div className="flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}cad-assets/adicionar.gif`} alt="" aria-hidden="true" className="h-10 w-10 shrink-0 object-contain" /><h1 className="text-2xl font-bold">Nova ocorrência</h1></div>
        {carregandoPlantao ? (
          <p className="mt-1 text-sm text-muted-foreground">Verificando plantão operacional...</p>
        ) : plantao ? (
          <p className="mt-1 text-sm text-success">
            Plantão ativo: {plantao.turno} · {new Date(plantao.data_inicio + "T12:00:00").toLocaleDateString("pt-BR")}
          </p>
        ) : (
          <p className="mt-1 text-sm text-warning">
            Nenhum plantão aberto. Inicie um plantão para habilitar o registro.
          </p>
        )}
      </div>

      <section className="space-y-4 card-3d animate-rise p-5">
        <h2 className="font-semibold text-primary">Classificação</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Origem</Label>
            <select className={selectCls} value={f.origem} onChange={(e) => set("origem", e.target.value)}>
              {ORIGENS.map((n) => <option key={n} className="bg-popover">{n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Natureza</Label>
            <select className={selectCls} value={f.natureza} onChange={(e) => set("natureza", e.target.value)}>
              {NATUREZAS.map((n) => <option key={n} className="bg-popover">{n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Prioridade</Label>
            <select className={selectCls} value={f.prioridade} onChange={(e) => set("prioridade", Number(e.target.value))}>
              {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k} className="bg-popover">{v.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 card-3d animate-rise p-5">
        <h2 className="font-semibold text-primary">Solicitante</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1"><Label>Nome</Label><Input value={f.solicitante_nome} onChange={(e) => set("solicitante_nome", e.target.value)} /></div>
          <div className="space-y-1"><Label>Telefone</Label><Input value={f.solicitante_telefone} onChange={(e) => set("solicitante_telefone", e.target.value)} /></div>
        </div>
      </section>

      <section className="space-y-4 card-3d animate-rise p-5">
        <h2 className="font-semibold text-primary">Local</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_120px]">
          <div className="space-y-1"><Label>Logradouro *</Label><Input required value={f.endereco} onChange={(e) => set("endereco", e.target.value)} /></div>
          <div className="space-y-1"><Label>Número</Label><Input value={f.numero} onChange={(e) => set("numero", e.target.value)} /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1"><Label>Bairro</Label><Input value={f.bairro} onChange={(e) => set("bairro", e.target.value)} /></div>
          <div className="space-y-1"><Label>Ponto de referência</Label><Input value={f.referencia} onChange={(e) => set("referencia", e.target.value)} /></div>
        </div>
      </section>

      <section className="space-y-4 card-3d animate-rise p-5">
        <h2 className="font-semibold text-primary">Relato *</h2>
        <Textarea required rows={6} value={f.relato} onChange={(e) => set("relato", e.target.value)} placeholder="Descreva os fatos relatados..." />
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/painel" })}>Cancelar</Button>
        <Button type="submit" disabled={saving || carregandoPlantao || !plantao}>
          {saving ? "Registrando..." : "Registrar ocorrência"}
        </Button>
      </div>
    </form>
  );
}

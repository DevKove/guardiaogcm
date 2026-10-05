import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Radio, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CAD · Guarda Municipal" },
      { name: "description", content: "Central de atendimento e registro de ocorrências da Guarda Municipal." },
      { property: "og:title", content: "CAD · Guarda Municipal" },
      { property: "og:description", content: "Central de atendimento e registro de ocorrências da Guarda Municipal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="stripe-top h-2" />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="flex items-center justify-between gap-3 text-primary">
          <img src={`${import.meta.env.BASE_URL}cad-assets/distintivo-de-policia.gif`} alt="" aria-hidden="true" className="h-12 w-12 object-contain" />
          <Shield className="hidden h-10 w-10" aria-hidden="true" />
          <span className="font-mono text-sm tracking-widest">GUARDA CIVIL MUNICIPAL</span><img src={`${import.meta.env.BASE_URL}cad-assets/policia.gif`} alt="" aria-hidden="true" className="h-16 w-16 shrink-0 object-contain" />
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-tight md:text-6xl">
          Central de Atendimento
          <br />e Despacho <span className="text-primary">— CAD</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Registro, acompanhamento e encerramento de ocorrências em tempo real.
        </p>
        <div className="mt-8">
          <Link
            to="/auth"
            className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
          >
            Acessar sistema
          </Link>
        </div>
        <div className="mt-10 flex items-center gap-4 border-y border-cyan-400/15 py-3 text-xs text-slate-400">
          <img src={`${import.meta.env.BASE_URL}cad-assets/walkie-talkie.gif`} alt="" aria-hidden="true" className="h-12 w-12 shrink-0 object-contain" />
          <div><div className="font-semibold uppercase tracking-wider text-cyan-300">Comunicação operacional</div><div className="mt-1">Atendimento, despacho e acompanhamento em um só ambiente.</div></div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: FileText, t: "Registro padronizado", d: "Natureza, prioridade, local e relato." },
            { icon: Radio, t: "Tempo real", d: "Painel atualiza sozinho a cada nova ocorrência." },
            { icon: Shield, t: "Perfis de acesso", d: "Operador, supervisor e administrador." },
          ].map((f) => (
            <div key={f.t} className="rounded-md border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{f.t}</div>
              <div className="text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

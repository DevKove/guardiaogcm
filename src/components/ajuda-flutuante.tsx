import { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  X,
} from "lucide-react";

const sections = [
  {
    number: "01",
    title: "Acesso e navegação",
    icon: "🔐",
    items: [
      "Faça login com sua conta autorizada. O menu disponível depende do seu perfil.",
      "Use Painel para acompanhar a operação, Nova para registrar atendimento e Plantão para o turno em tempo real.",
      "O menu Itens reúne Armas, Rádios e CAD. Usuários fica disponível para administradores.",
    ],
  },
  {
    number: "02",
    title: "Plantão",
    icon: "🕐",
    items: [
      "Abra o plantão antes de iniciar os registros operacionais.",
      "Mantenha equipe, guarnições, postos, atividades, materiais, informativos e observações atualizados.",
      "A atualização em tempo real e os registros do serviço ficam concentrados na área Plantão.",
      "Ao terminar, revise as informações, assine e finalize. O encerramento gera o registro histórico.",
    ],
  },
  {
    number: "03",
    title: "Ocorrências",
    icon: "📞",
    items: [
      "Use Nova ocorrência e informe natureza, prioridade, local, solicitante e relato.",
      "Acompanhe o fluxo de despacho, chegada, atendimento e encerramento.",
      "Abra a ocorrência no Painel para consultar ou atualizar detalhes conforme suas permissões.",
    ],
  },
  {
    number: "04",
    title: "Viaturas, equipe e postos",
    icon: "🚔",
    items: [
      "Viaturas: mantenha status, prefixo, placa e guarnição atualizados.",
      "Equipe: consulte agentes e vínculos operacionais disponíveis.",
      "Postos fixos: consulte os locais cadastrados e suas informações operacionais.",
    ],
  },
  {
    number: "05",
    title: "Itens operacionais",
    icon: "🎒",
    items: [
      "Armas e rádios devem ser retirados e devolvidos com rastreabilidade.",
      "Confira quem retirou, quando ocorreu a retirada e quando o item foi devolvido.",
      "Itens CAD são usados para outros materiais controlados pelo administrador.",
    ],
  },
  {
    number: "06",
    title: "Relatórios e histórico",
    icon: "📊",
    items: [
      "Use Relatórios para consultas operacionais e Histórico para localizar registros anteriores.",
      "Antes de imprimir ou encerrar um plantão, confira datas, horários, equipe e registros.",
      "Em caso de divergência, solicite correção ao responsável pelo sistema.",
    ],
  },
  {
    number: "07",
    title: "Segurança",
    icon: "🛡️",
    items: [
      "Nunca compartilhe sua senha ou deixe sua sessão aberta em computador sem supervisão.",
      "Use somente sua própria conta e respeite seu nível de autorização.",
      "Ao perceber comportamento estranho, erro de permissão ou informação incorreta, informe o administrador.",
    ],
  },
];

export function AjudaFlutuante() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-card/95 text-primary shadow-xl ring-4 ring-primary/5 backdrop-blur transition-all duration-200 hover:scale-110 hover:border-primary hover:bg-card hover:shadow-[0_10px_36px_rgba(0,0,0,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background print:hidden sm:bottom-6 sm:left-6"
        aria-label="Abrir instruções de uso"
        title="Ajuda e instruções de uso"
      >
        <CircleHelp className="h-8 w-8" strokeWidth={2.2} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm print:hidden sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ajuda-titulo"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section className="relative flex h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl">
            <header className="relative shrink-0 overflow-hidden border-b border-border bg-card">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
              <div className="relative flex items-center gap-3 px-4 py-4 sm:px-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-sm">
                  <ShieldCheck className="h-6 w-6" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                      Guardião GCM · CAD
                    </span>
                    <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Guia rápido
                    </span>
                  </div>
                  <h2 id="ajuda-titulo" className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                    Instruções de uso
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                    Consulte rapidamente como utilizar os principais recursos do sistema.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  aria-label="Fechar instruções"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative grid grid-cols-3 border-t border-border bg-muted/20 text-center">
                <div className="border-r border-border px-2 py-2">
                  <strong className="block text-sm font-black">07</strong>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Tópicos</span>
                </div>
                <div className="border-r border-border px-2 py-2">
                  <strong className="block text-sm font-black">24h</strong>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Operação</span>
                </div>
                <div className="px-2 py-2">
                  <strong className="block text-sm font-black">100%</strong>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Rastreável</span>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl p-4 sm:p-6">
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <ClipboardCheck className="mb-2 h-5 w-5 text-primary" />
                    <p className="text-xs font-bold">Confira antes de salvar</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Dados corretos evitam retrabalho e divergências.</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <BookOpen className="mb-2 h-5 w-5 text-primary" />
                    <p className="text-xs font-bold">Registre os fatos</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Mantenha os registros objetivos e cronológicos.</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                    <p className="text-xs font-bold">Proteja sua conta</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Nunca compartilhe senha ou sessão.</p>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-black">Como utilizar o sistema</h3>
                    <p className="text-[11px] text-muted-foreground">Selecione mentalmente o tópico que precisa e consulte as orientações.</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {sections.map((section) => (
                    <article
                      key={section.title}
                      className="group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-lg">
                          {section.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-black tracking-widest text-primary">{section.number}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                          </div>
                          <h4 className="mt-0.5 text-sm font-black">{section.title}</h4>
                        </div>
                      </div>

                      <ul className="mt-3 space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs font-black">Precisa de mais detalhes?</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Consulte o manual completo para procedimentos, permissões, segurança e orientações administrativas.
                      </p>
                      <a
                        href="https://github.com/DevKove/guardiaogcm/blob/main/docs/MANUAL-DO-USUARIO.md"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-background px-3 py-2 text-[11px] font-black text-primary shadow-sm transition hover:bg-primary/10"
                      >
                        <BookOpen className="h-4 w-4" />
                        Abrir manual completo
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card/90 px-4 py-3 sm:px-6">
              <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">
                Guia rápido · Guardião GCM
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto inline-flex items-center rounded-lg bg-primary px-5 py-2 text-xs font-black text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Entendi
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

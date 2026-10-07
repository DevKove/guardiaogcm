import { useState } from "react";
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronRight, CircleHelp,
  ClipboardCheck, FileText, LockKeyhole, ShieldCheck, X,
} from "lucide-react";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const sections = [
  {
    number: "01", title: "Acesso e navegação", image: "IMG/gif/policia.gif", label: "ACESSO",
    description: "Como entrar, identificar o perfil e navegar pelo CAD com segurança.",
    steps: [
      "Faça login somente com sua conta autorizada e confira se o nome e o perfil exibidos estão corretos.",
      "Após entrar, observe o Painel e o menu lateral. As opções disponíveis variam conforme suas permissões.",
      "Use Painel para acompanhar a operação; Nova para iniciar um atendimento; Plantão para os registros do turno.",
      "Antes de realizar qualquer alteração, confirme se está trabalhando no plantão e no registro corretos.",
      "Ao terminar o uso do sistema, encerre a sessão quando estiver em equipamento compartilhado."
    ],
  },
  {
    number: "02", title: "Plantão", image: "IMG/gif/relatorio.gif", label: "PLANTÃO",
    description: "Procedimento recomendado para abertura, acompanhamento e encerramento do serviço.",
    steps: [
      "Abra o plantão antes de iniciar os registros operacionais do turno e confirme data, horário e operador.",
      "Confira a composição da equipe e as guarnições. Ao editar uma viatura, verifique os integrantes já vinculados antes de salvar.",
      "Durante o turno, mantenha atualizados os registros de equipe, viaturas, postos, atividades, materiais, informativos e observações.",
      "Use a área Plantão para acompanhar a atualização em tempo real e verificar as informações produzidas durante o serviço.",
      "Antes de finalizar, revise horários, equipe, viaturas, ocorrências e demais registros. Corrija divergências enquanto o plantão estiver editável.",
      "No encerramento, confira o resumo, realize a assinatura quando solicitada e finalize o plantão. O registro passa a integrar o Histórico."
    ],
  },
  {
    number: "03", title: "Ocorrências e atendimentos", image: "IMG/gif/telefone.gif", label: "ATENDIMENTO",
    description: "Fluxo recomendado desde o recebimento da solicitação até o encerramento.",
    steps: [
      "Ao receber uma solicitação, abra Nova ocorrência e informe a natureza do atendimento, prioridade, local e solicitante.",
      "Descreva o fato de maneira objetiva, cronológica e suficiente para que outra equipe consiga compreender a situação.",
      "Revise os dados antes de salvar. Evite abreviações ou informações que possam gerar interpretação equivocada.",
      "Acompanhe o despacho da viatura e, quando aplicável, os registros de chegada, atendimento e conclusão.",
      "Atualize a ocorrência sempre que houver uma mudança relevante no atendimento e conforme suas permissões.",
      "Antes de encerrar, confira se o relato final representa o que efetivamente ocorreu e se os campos obrigatórios estão preenchidos."
    ],
  },
  {
    number: "04", title: "Viaturas e equipe", image: "IMG/gif/viatura.gif", label: "PATRULHAMENTO",
    description: "Organização das viaturas, integrantes e informações operacionais do plantão.",
    steps: [
      "Em Viaturas, confira prefixo, placa, status e demais informações antes de utilizar a viatura em um atendimento.",
      "Ao montar a guarnição, selecione os integrantes ativos que realmente compõem aquela equipe.",
      "Se a viatura já possuir integrantes no plantão, confira os nomes exibidos antes de fazer qualquer alteração.",
      "Para substituir a guarnição, remova ou altere os integrantes conforme a operação real e salve a composição atualizada.",
      "Mantenha a composição coerente durante o plantão. Alterações devem representar a situação operacional real.",
      "Use Equipe para consultar os agentes cadastrados e Postos fixos para consultar os locais de referência operacional."
    ],
  },
  {
    number: "05", title: "Armas, rádios e itens", image: "IMG/gif/armamento.gif", label: "CONTROLE",
    description: "Controle de retirada, uso e devolução dos itens operacionais.",
    steps: [
      "Antes de retirar um item, confirme identificação, situação e disponibilidade no cadastro.",
      "Registre a retirada vinculando corretamente o item ao servidor responsável e ao plantão correspondente.",
      "Confira visualmente o item e, quando aplicável, número de patrimônio, identificação ou outras informações cadastradas.",
      "Durante o serviço, mantenha a responsabilidade pelo item e não transfira a posse sem o devido registro.",
      "Na devolução, confirme o item e registre o retorno. Verifique se o status foi atualizado corretamente.",
      "Se houver divergência, dano, item não localizado ou erro de cadastro, comunique o responsável e não tente ocultar ou contornar o registro."
    ],
  },
  {
    number: "06", title: "Relatórios, PDF e histórico", image: "IMG/gif/analizando relatorio.gif", label: "DOCUMENTAÇÃO",
    description: "Como conferir os registros e produzir documentação confiável do serviço.",
    steps: [
      "Use Relatórios para consultas e documentos operacionais disponíveis no sistema.",
      "Use Histórico para localizar plantões e registros já encerrados e consultar o que foi registrado anteriormente.",
      "Antes de gerar ou imprimir um relatório, confira identificação, período, horários, equipe, viaturas e informações do atendimento.",
      "Ao revisar um plantão, confirme se os registros apresentados correspondem ao que foi efetivamente produzido durante o serviço.",
      "Quando o documento estiver correto, utilize a visualização/impressão para gerar a versão destinada ao arquivo ou conferência.",
      "Se encontrar uma divergência em registro histórico, comunique o responsável pelo sistema em vez de criar informação duplicada."
    ],
  },
  {
    number: "07", title: "Segurança e boas práticas", image: "IMG/gif/supervisor.gif", label: "SEGURANÇA",
    description: "Cuidados essenciais para preservar contas, dados e rastreabilidade.",
    steps: [
      "Nunca compartilhe sua senha, sessão ou credenciais. Cada usuário deve operar com sua própria conta.",
      "Não tente acessar funções ou registros que não façam parte das suas permissões.",
      "Evite deixar o sistema aberto em computador sem supervisão, especialmente em telas com dados operacionais.",
      "Confira cuidadosamente informações antes de salvar, principalmente nomes, horários, viaturas, itens e relatos.",
      "Ao perceber comportamento estranho, alteração indevida, erro de permissão ou registro inesperado, informe o administrador.",
      "Não tente burlar uma restrição do sistema. A rastreabilidade dos registros é parte da segurança operacional."
    ],
  },
];

export function AjudaFlutuante() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-card/95 text-primary shadow-xl ring-4 ring-primary/5 backdrop-blur transition-all duration-200 hover:scale-110 hover:border-primary hover:bg-card hover:shadow-[0_10px_36px_rgba(0,0,0,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background print:hidden sm:bottom-6 sm:left-6"
        aria-label="Abrir instruções de uso" title="Ajuda e instruções de uso">
        <CircleHelp className="h-8 w-8" strokeWidth={2.2} aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-md print:hidden sm:p-5"
          role="dialog" aria-modal="true" aria-labelledby="ajuda-titulo"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="relative flex h-[min(94vh,960px)] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-border bg-background text-foreground shadow-2xl">
            <header className="relative shrink-0 overflow-hidden border-b border-border bg-card">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-transparent to-primary/5" />
              <div className="absolute -right-10 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative grid items-center gap-5 px-5 py-5 sm:grid-cols-[1fr_240px] sm:px-7 sm:py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/25 bg-background/80 shadow-sm">
                    <img src={asset("IMG/guarda.png")} alt="" className="h-11 w-11 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Guardião GCM · CAD</span>
                      <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Guia operacional</span>
                    </div>
                    <h2 id="ajuda-titulo" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Instruções de uso</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">Procedimentos passo a passo para utilização segura e correta do CAD.</p>
                  </div>
                </div>
                <div className="hidden items-center justify-end gap-3 sm:flex">
                  <img src={asset("IMG/gif/brasão.gif")} alt="" className="h-20 w-20 object-contain drop-shadow-lg" />
                  <div className="text-right"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Operação</p><p className="text-lg font-black">24 horas</p><p className="text-[10px] text-muted-foreground">CAD · GCM</p></div>
                </div>
              </div>
              <div className="relative grid grid-cols-3 border-t border-border bg-muted/20 text-center">
                <div className="border-r border-border px-2 py-2.5"><strong className="block text-sm font-black">07</strong><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Procedimentos</span></div>
                <div className="border-r border-border px-2 py-2.5"><strong className="block text-sm font-black">Visual</strong><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Passo a passo</span></div>
                <div className="px-2 py-2.5"><strong className="block text-sm font-black">100%</strong><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Rastreável</span></div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-4xl p-4 sm:p-7">
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4"><ClipboardCheck className="mb-2 h-5 w-5 text-primary" /><p className="text-xs font-black">1. Confira</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Verifique os dados antes de salvar ou finalizar.</p></div>
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"><BookOpen className="mb-2 h-5 w-5 text-primary" /><p className="text-xs font-black">2. Registre</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Documente os fatos com clareza e ordem cronológica.</p></div>
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"><LockKeyhole className="mb-2 h-5 w-5 text-primary" /><p className="text-xs font-black">3. Proteja</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Use sua conta e respeite as permissões.</p></div>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div>
                  <div><h3 className="text-sm font-black">Procedimentos operacionais</h3><p className="text-[11px] text-muted-foreground">Selecione mentalmente cada etapa antes de avançar para a próxima.</p></div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {sections.map((section) => (
                    <article key={section.title} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                      <div className="relative h-32 overflow-hidden bg-muted/30">
                        <img src={asset(section.image)} alt="" loading="lazy" className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent" />
                        <span className="absolute bottom-2 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[8px] font-black tracking-[0.18em] text-white backdrop-blur">{section.label}</span>
                        <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-[9px] font-black text-primary shadow-sm">{section.number}</span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div><h4 className="text-sm font-black">{section.title}</h4><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{section.description}</p></div>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                        <ol className="mt-3 space-y-2.5 border-t border-border pt-3">
                          {section.steps.map((item, index) => (
                            <li key={item} className="flex gap-2.5 text-[11px] leading-relaxed text-muted-foreground">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-black text-primary">{index + 1}</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-xs font-black">Regra de ouro</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Confira → registre → revise → finalize. Se houver divergência, corrija enquanto o registro estiver editável.</p></div></div>
                    <ArrowRight className="hidden h-5 w-5 text-primary sm:block" />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-xs font-black">Precisa de mais detalhes?</p><p className="mt-1 text-[11px] text-muted-foreground">Consulte o manual completo para procedimentos, permissões, segurança e orientações administrativas.</p></div>
                    <a href="https://github.com/DevKove/guardiaogcm/blob/main/docs/MANUAL-DO-USUARIO.md" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-background px-3 py-2 text-[11px] font-black text-primary shadow-sm transition hover:bg-primary/10"><BookOpen className="h-4 w-4" />Manual completo</a>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
              <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">Guia operacional · Guardião GCM</span>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-black text-primary-foreground shadow-sm transition hover:opacity-90">Entendi <CheckCircle2 className="h-4 w-4" /></button>
            </footer>
            <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-accent hover:text-foreground sm:right-5 sm:top-5" aria-label="Fechar instruções"><X className="h-4 w-4" /></button>
          </section>
        </div>
      )}
    </>
  );
}

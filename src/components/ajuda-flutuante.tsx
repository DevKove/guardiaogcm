import { useState } from "react";
import { BookOpen, ChevronRight, CircleHelp, X } from "lucide-react";
import ajudaImage from "../../IMG/ajuda.png";

const sections = [
  { title: "Acesso e navegação", items: [
    "Faça login com sua conta autorizada. O menu superior dá acesso aos módulos disponíveis para seu perfil.",
    "Use Painel para acompanhar ocorrências, Nova para registrar atendimento e Plantão para a operação em tempo real.",
    "O menu Itens reúne Armas, Rádios e CAD. Usuários fica disponível para administradores.",
  ]},
  { title: "Plantão", items: [
    "Abra o plantão antes de iniciar os registros operacionais.",
    "Durante o serviço, mantenha atualizados equipe, guarnições, postos, atividades, materiais, informativo e observações.",
    "A atualização em tempo real e os registros do serviço ficam concentrados na área Plantão.",
    "Ao terminar, revise as informações, assine e finalize o plantão. O encerramento gera o registro histórico para consulta.",
  ]},
  { title: "Ocorrências", items: [
    "Use Nova ocorrência para registrar a solicitação e informe natureza, prioridade, local, solicitante e relato.",
    "Após o cadastro, acompanhe o fluxo de despacho, chegada, atendimento e encerramento.",
    "Clique em uma ocorrência no Painel para consultar ou atualizar seus detalhes conforme suas permissões.",
  ]},
  { title: "Viaturas, equipe e postos", items: [
    "Viaturas: consulte e mantenha o status operacional, prefixo, placa e guarnição atualizados.",
    "Equipe: consulte agentes e vínculos operacionais disponíveis.",
    "Postos fixos: consulte os postos cadastrados e suas informações operacionais.",
  ]},
  { title: "Itens operacionais", items: [
    "Armas e rádios devem ser retirados e devolvidos com rastreabilidade.",
    "Confira sempre quem retirou o item, quando ocorreu a retirada e quando foi devolvido.",
    "Itens CAD são usados para outros materiais controlados pelo administrador.",
  ]},
  { title: "Relatórios e histórico", items: [
    "Use Relatórios para consultar documentos operacionais e Histórico para localizar registros anteriores.",
    "Antes de imprimir ou encerrar um plantão, confira datas, horários, equipe e registros lançados.",
    "Em caso de divergência, não tente contornar as permissões: solicite correção ao responsável pelo sistema.",
  ]},
  { title: "Segurança", items: [
    "Nunca compartilhe sua senha ou deixe a sessão aberta em computador sem supervisão.",
    "Use somente sua própria conta e não tente acessar registros que não pertencem ao seu nível de autorização.",
    "Ao perceber comportamento estranho, erro de permissão ou informação incorreta, informe o administrador.",
  ]},
];

export function AjudaFlutuante() {
  const [open, setOpen] = useState(false);
  // Usa o caminho publicado como primeira opção e o arquivo do repositório como fallback.\n  // Isso evita que o botão fique vazio quando o GitHub Pages ainda estiver propagando o diretório IMG.\n  const asset = import.meta.env.BASE_URL + "IMG/ajuda.png";\n  const assetFallback = "https://raw.githubusercontent.com/DevKove/guardiaogcm/main/IMG/ajuda.png";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[80] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-300/70 bg-slate-950/90 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,.45)] ring-1 ring-cyan-400/20 backdrop-blur transition-all duration-200 hover:scale-110 hover:border-cyan-200 hover:shadow-[0_10px_36px_rgba(34,211,238,.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 print:hidden sm:bottom-6 sm:left-6"
        aria-label="Abrir instruções de uso"
        title="Ajuda e instruções de uso"
      >
        <img\n          src={asset}\n          alt=""\n          aria-hidden="true"\n          className="h-full w-full rounded-full object-contain"\n          onError={(event) => {\n            if (event.currentTarget.src !== assetFallback) event.currentTarget.src = assetFallback;\n          }}\n        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-start bg-black/70 p-3 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ajuda-titulo"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-background text-foreground shadow-2xl">
            <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-400/30 bg-cyan-400/5">
                <img\n                  src={asset}\n                  alt=""\n                  aria-hidden="true"\n                  className="h-9 w-9 object-contain"\n                  onError={(event) => {\n                    if (event.currentTarget.src !== assetFallback) event.currentTarget.src = assetFallback;\n                  }}\n                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="ajuda-titulo" className="text-base font-black tracking-wide sm:text-lg">Instruções de uso</h2>
                <p className="text-xs text-muted-foreground">Guia rápido do Guardião GCM · CAD</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground" aria-label="Fechar instruções">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Use este botão sempre que precisar consultar rapidamente o funcionamento do sistema.
                  As permissões disponíveis podem variar conforme o seu perfil de acesso.
                </p>
              </div>

              <div className="space-y-3">
                {sections.map((section) => (
                  <article key={section.title} className="rounded-xl border border-border bg-card/70 p-3 sm:p-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold"><ChevronRight className="h-4 w-4 text-primary" />{section.title}</h3>
                    <ul className="mt-2 space-y-2 pl-6 text-xs leading-relaxed text-muted-foreground">
                      {section.items.map((item) => <li key={item} className="list-disc">{item}</li>)}
                    </ul>
                  </article>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold"><BookOpen className="h-4 w-4 text-primary" />Manual completo do usuário</div>
                <a href="https://github.com/DevKove/guardiaogcm/blob/main/docs/MANUAL-DO-USUARIO.md" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-primary/30 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/10">
                  Abrir manual completo
                </a>
              </div>
            </div>

            <footer className="shrink-0 border-t border-border bg-card/80 px-4 py-3 text-right sm:px-5">
              <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90">Entendi</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({ meta: [{ title: "Termos de Uso · Guardião GCM" }, { name: "description", content: "Termos de Uso do Guardião GCM." }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="stripe-top h-2" />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5">
          <Link to="/" className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div><div className="font-bold">CAD GUARDA MUNICIPAL</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Guardião GCM</div></div>
          </Link>
          <Link to="/auth" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Acesso ao sistema</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10">
        <article className="prose prose-slate max-w-none dark:prose-invert">
          <h1>Termos de Uso</h1>
          <p><strong>Guardião GCM · CAD — Central de Atendimento e Despacho</strong></p>
          <p className="text-sm text-muted-foreground">Última atualização: 07/10/2026</p>
          <Section title="1. Objeto">O Guardião GCM é um sistema informatizado de apoio à atividade operacional, destinado ao registro, organização, acompanhamento e consulta de informações relacionadas a atendimento, despacho, ocorrências, plantões, equipes, viaturas, postos, itens operacionais e relatórios.</Section>
          <Section title="2. Aceitação">O acesso e a utilização do sistema pressupõem ciência e concordância com estes Termos de Uso, a Política de Privacidade e as normas internas aplicáveis ao órgão responsável pela operação.</Section>
          <Section title="3. Acesso restrito">Cada usuário é responsável pela guarda de suas credenciais, por não compartilhá-las, por encerrar sua sessão em equipamentos compartilhados e por comunicar suspeitas de acesso indevido.</Section>
          <Section title="4. Uso autorizado">O sistema deve ser utilizado somente para finalidades legítimas, institucionais e autorizadas, dentro das permissões concedidas ao usuário.</Section>
          <Section title="5. Usos proibidos"><ul><li>Acessar dados sem autorização.</li><li>Contornar autenticação, RLS ou controles de acesso.</li><li>Inserir informação deliberadamente falsa ou maliciosa.</li><li>Realizar SQL injection, brute force, varreduras abusivas ou exploração de vulnerabilidades.</li><li>Introduzir malware ou código malicioso.</li><li>Divulgar dados protegidos sem autorização.</li></ul></Section>
          <Section title="6. Conteúdo e decisões">As informações inseridas são de responsabilidade de quem as registra e do órgão operador, conforme suas atribuições. O sistema é ferramenta de apoio e não substitui decisões de autoridades, normas ou procedimentos institucionais.</Section>
          <Section title="7. Segurança e terceiros">Nenhum sistema conectado à internet é absolutamente invulnerável. O sistema pode depender de provedores externos de hospedagem, autenticação, banco de dados e infraestrutura.</Section>
          <Section title="8. Limitação de responsabilidade">Na máxima extensão permitida pela legislação aplicável, os desenvolvedores, autores, mantenedores e gestores técnicos não respondem por uso indevido, atos de usuários ou terceiros, informações incorretas, decisões tomadas com base nos registros, indisponibilidade de internet ou infraestrutura, ataques cibernéticos, malware, credenciais comprometidas, falhas de serviços externos ou outros eventos fora de seu controle razoável. Esta cláusula não pretende excluir responsabilidades que a lei não permita afastar.</Section>
          <Section title="9. Auditoria">Podem ser mantidos logs, históricos e registros técnicos para segurança, auditoria, investigação de incidentes, continuidade operacional e cumprimento de obrigações legais.</Section>
          <Section title="10. Suspensão">O acesso poderá ser suspenso ou revogado em caso de uso indevido, violação de segurança, suspeita de comprometimento, descumprimento destes termos ou determinação administrativa/legal.</Section>
          <Section title="11. Lei aplicável">Aplicam-se a legislação brasileira e as normas institucionais do órgão responsável pela operação.</Section>
          <div className="not-prose mt-10 rounded-lg border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground">O uso do sistema não transfere aos desenvolvedores ou mantenedores técnicos a responsabilidade pelos atos praticados pelos usuários, pelo órgão operador ou por terceiros, observados os limites legais.</div>
        </article>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-7"><h2 className="text-xl font-bold">{title}</h2><div className="mt-2 leading-7 text-muted-foreground">{children}</div></section>;
}

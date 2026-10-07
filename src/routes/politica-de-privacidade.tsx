import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({ meta: [{ title: "Política de Privacidade · Guardião GCM" }, { name: "description", content: "Política de Privacidade do Guardião GCM." }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
          <h1>Política de Privacidade</h1>
          <p><strong>Guardião GCM · CAD — Central de Atendimento e Despacho</strong></p>
          <p className="text-sm text-muted-foreground">Última atualização: 07/10/2026</p>
          <Section title="1. Objetivo">Esta Política explica como dados pessoais podem ser tratados no Guardião GCM. O tratamento deve observar a legislação brasileira aplicável, especialmente a Lei nº 13.709/2018 (LGPD).</Section>
          <Section title="2. Responsável pelo tratamento">O órgão ou entidade responsável pela operação do CAD define as finalidades institucionais e os procedimentos de tratamento. Desenvolvedores e mantenedores técnicos não assumem automaticamente a posição de controlador apenas por criarem ou manterem o software.</Section>
          <Section title="3. Dados tratados">Podem ser tratados dados de identificação funcional, e-mail, perfil, autenticação, equipes, plantões, ocorrências, endereços relacionados aos atendimentos, viaturas, itens, histórico e logs técnicos, conforme a finalidade e necessidade.</Section>
          <Section title="4. Finalidades">Os dados podem ser tratados para autenticação, controle de permissões, atendimento, despacho, registro de ocorrências, gestão de plantões, organização operacional, relatórios, histórico, segurança e cumprimento de obrigações legais.</Section>
          <Section title="5. Minimização">Usuários devem inserir somente dados necessários, pertinentes, verdadeiros e autorizados. Não devem ser inseridas senhas, segredos de autenticação ou informações pessoais excessivas sem necessidade operacional.</Section>
          <Section title="6. Compartilhamento">O acesso e eventual compartilhamento devem ocorrer somente quando houver fundamento jurídico e necessidade operacional, administrativa, legal ou de segurança. Podem existir provedores técnicos de hospedagem, autenticação e infraestrutura.</Section>
          <Section title="7. Segurança">O sistema utiliza mecanismos compatíveis com sua arquitetura, mas nenhuma tecnologia conectada à internet é absolutamente invulnerável. Usuários devem proteger credenciais e comunicar incidentes.</Section>
          <Section title="8. Incidentes e ataques">Na máxima extensão permitida pela legislação, desenvolvedores e mantenedores técnicos não assumem responsabilidade automática por incidentes provocados por terceiros, invasões, malware, credenciais comprometidas, falhas de provedores, ataques de negação de serviço ou eventos fora de seu controle razoável. A responsabilidade legal de cada agente será analisada conforme sua efetiva atuação e a legislação aplicável.</Section>
          <Section title="9. Retenção">Os dados podem ser mantidos pelo período necessário às finalidades institucionais, obrigações legais, auditoria, segurança, preservação do histórico e exercício regular de direitos.</Section>
          <Section title="10. Direitos dos titulares">Os direitos previstos na LGPD devem ser exercidos perante o controlador responsável pelo tratamento, pelos canais oficiais do órgão ou entidade que opera o CAD.</Section>
          <Section title="11. Credenciais">Credenciais são pessoais e intransferíveis. O usuário deve manter sua senha em sigilo, encerrar sessões em equipamentos compartilhados e comunicar suspeitas de comprometimento.</Section>
          <Section title="12. Desenvolvedores e mantenedores">A criação ou manutenção do software não significa acesso irrestrito aos dados operacionais. Eventual acesso técnico autorizado deve limitar-se ao necessário para manutenção, segurança, diagnóstico ou suporte.</Section>
          <Section title="13. Alterações">Esta Política poderá ser atualizada para refletir mudanças legais, técnicas ou operacionais. A versão vigente ficará disponível no sistema.</Section>
          <Section title="14. Contato">Questões relacionadas ao tratamento de dados pessoais devem ser direcionadas ao órgão ou entidade responsável pela operação do Guardião GCM, por seus canais administrativos oficiais.</Section>
        </article>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-7"><h2 className="text-xl font-bold">{title}</h2><div className="mt-2 leading-7 text-muted-foreground">{children}</div></section>;
}

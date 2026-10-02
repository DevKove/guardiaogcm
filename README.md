# Guardião GCM

Sistema web de **Atendimento e Despacho (CAD) para Guarda Civil Municipal**, desenvolvido para centralizar o registro e acompanhamento de ocorrências, plantões, viaturas, postos, escalas, usuários e relatórios operacionais.

O projeto utiliza **React + TanStack + Vite** no frontend e **Supabase** como backend, autenticação e banco de dados PostgreSQL com RLS.

## Acesso

**Aplicação em produção:**  
https://devkove.github.io/guardiaogcm/

**Repositório:**  
https://github.com/DevKove/guardiaogcm

O frontend é publicado gratuitamente pelo **GitHub Pages**. O backend permanece no **Supabase**.

---

## Funcionalidades

### Atendimento e ocorrências
- Registro de novas ocorrências.
- Classificação por natureza e prioridade.
- Origem da solicitação.
- Dados do solicitante.
- Endereço, bairro e referência.
- Relato da ocorrência.
- Registro de envolvidos.
- Vinculação da ocorrência ao plantão aberto.
- Despacho de viatura.
- Registro de chegada ao local.
- Encerramento da ocorrência.
- Desfecho e observações.
- Histórico da ocorrência.
- Detalhamento e impressão.

### Plantão
- Abertura e encerramento de plantão.
- Operador responsável.
- Supervisor.
- Operador de rádio.
- Equipe e horário.
- Guarnições.
- Postos fixos.
- Atividades.
- Materiais.
- Informativo.
- Atividades do verso.
- Registro manual de atividades.
- Histórico do plantão.
- Relatório do plantão.

### Viaturas
- Cadastro de viaturas.
- Prefixo e placa.
- Modelo e tipo.
- Status operacional.
- Guarnição.
- Quilometragem.
- Observações.
- Vinculação com ocorrências.
- Controle de disponibilidade.

### Postos fixos
- Cadastro de postos.
- Tipo do posto.
- Endereço e bairro.
- Telefone.
- Responsável.
- Horário.
- Observações.
- Ativação/inativação.

### Escalas
- Cadastro de novas escalas.
- Data e turno.
- Horário de início e término.
- Agentes.
- Função.
- Posto fixo.
- Viatura.
- Observações.

### Usuários e acesso
- Autenticação pelo Supabase Auth.
- Perfis de acesso:
  - **Administrador**
  - **Supervisor**
  - **Operador**
- Cadastro, edição e exclusão de usuários por administrador.
- Controle de funções por banco de dados.
- Operações administrativas protegidas por Edge Function.
- Proteção por Row Level Security (RLS).

### Relatórios e histórico
- Relatórios operacionais.
- Consulta de ocorrências.
- Histórico de operações.
- Detalhamento de plantões.
- Impressão de registros.

---

## Arquitetura

### Frontend
- React
- TypeScript
- TanStack Router
- TanStack Query
- Vite
- Tailwind CSS
- Radix UI
- Lucide React

### Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Edge Functions
- Row Level Security (RLS)

### Hospedagem
- GitHub Pages para o frontend.
- Supabase para banco, autenticação e funções de backend.
- GitHub Actions para build e publicação automática.

---

## Segurança

O sistema utiliza controles de acesso no frontend e, principalmente, no backend.

- RLS habilitado nas principais tabelas.
- Autorização baseada em funções armazenadas em `user_roles`.
- Operações administrativas de usuários executadas por Edge Function.
- Chaves secretas do Supabase não são utilizadas no frontend.
- A chave pública/publishable pode ser utilizada no cliente.
- Funções administrativas verificam o usuário autenticado e sua função.
- Índices e permissões do banco foram ajustados para o funcionamento operacional do CAD.
- Operações sensíveis permanecem protegidas por políticas e funções do PostgreSQL.

**Nunca coloque uma `service_role` key ou chave `sb_secret_` no código frontend ou em variáveis `VITE_*`.**

---

## Banco de dados

Principais tabelas:

- `profiles`
- `user_roles`
- `ocorrencias`
- `ocorrencia_historico`
- `ocorrencia_envolvidos`
- `viaturas`
- `postos_fixos`
- `escalas`
- `plantoes`
- `plantao_registros`
- `plantao_historico`
- `avisos`

As operações são vinculadas ao usuário autenticado e, quando aplicável, ao plantão operacional.

---

## Desenvolvimento local

Requisitos:

- Node.js
- npm ou Bun
- Conta/projeto Supabase para ambiente de desenvolvimento

Clone o projeto:

```bash
git clone https://github.com/DevKove/guardiaogcm.git
cd guardiaogcm
```

Instale as dependências:

```bash
npm install
```

ou:

```bash
bun install
```

Configure as variáveis de ambiente em um arquivo `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

ou:

```bash
bun run dev
```

---

## Build

Para gerar a versão de produção:

```bash
npm run build
```

ou:

```bash
bun run build
```

O projeto possui configuração específica para publicação no GitHub Pages, incluindo a base:

```
/guardiaogcm/
```

---

## Deploy

O deploy de produção é realizado pelo GitHub Actions.

Fluxo:

```
GitHub
   |
   v
GitHub Actions
   |
   v
Build Vite/TanStack
   |
   v
GitHub Pages
   |
   +------> Supabase Auth
   |
   +------> Supabase PostgreSQL
   |
   +------> Supabase Edge Functions
```

Alterações enviadas para a branch de produção acionam o workflow de publicação.

---

## Fluxo operacional principal

O fluxo previsto para utilização do CAD é:

```
Login
  ↓
Abertura do Plantão
  ↓
Central / Atendimento
  ↓
Nova Ocorrência
  ↓
Registro e classificação
  ↓
Despacho da Viatura
  ↓
Chegada ao local
  ↓
Atendimento
  ↓
Encerramento
  ↓
Desfecho
  ↓
Histórico
  ↓
Relatório do Plantão
```

---

## Perfis de acesso

| Função | Acesso |
|---|---|
| Administrador | Administração completa, usuários e configurações operacionais |
| Supervisor | Operação e funções de supervisão permitidas pelo RLS |
| Operador | Atendimento, ocorrências e operações permitidas pelo plantão |

O controle efetivo de acesso deve ser realizado pelas políticas do Supabase e pelas funções de autorização do banco, não apenas pela interface.

---

## Status do projeto

O projeto está configurado para operar com:

- Frontend publicado no GitHub Pages.
- Backend no Supabase.
- Autenticação integrada.
- Banco PostgreSQL.
- RLS nas tabelas operacionais.
- Gestão administrativa de usuários via Supabase Edge Function.
- Plantão operacional.
- Ocorrências vinculadas ao plantão.
- Viaturas.
- Postos fixos.
- Escalas.
- Histórico.
- Relatórios.
- Pipeline de build e deploy automático.

### Próxima etapa de validação

A validação funcional deve ser realizada pelo seguinte fluxo:

**Login → abrir plantão → nova ocorrência → despachar VTR → registrar chegada → encerrar ocorrência → consultar histórico → emitir relatório.**

O projeto deve continuar sendo validado em ambiente real antes de ser considerado definitivamente homologado para uso operacional.

---

## Licença

Projeto privado/de uso controlado. Consulte os responsáveis pelo repositório antes de redistribuir, modificar ou utilizar o sistema em outro ambiente.

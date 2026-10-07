# 🛡️ Guardião GCM
## CAD — Central de Atendimento e Despacho
### Guarda Civil Municipal de Araçoiaba da Serra · SP

<p align="center">
  <img src="IMG/guarda.png" alt="Guarda Municipal" width="120">
</p>

<p align="center">
  <strong>Sistema operacional web para atendimento, despacho, gestão de ocorrências e controle de plantões.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento%20ativo-0ea5e9?style=for-the-badge">
  <img src="https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61dafb?style=for-the-badge&logo=react&logoColor=white">
  <img src="https://img.shields.io/badge/backend-Supabase-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white">
  <img src="https://img.shields.io/badge/deploy-GitHub%20Pages-222?style=for-the-badge&logo=github&logoColor=white">
</p>

---

## 🚨 Sobre o projeto

O **Guardião GCM** é um CAD desenvolvido para centralizar a operação da Guarda Civil Municipal, reunindo em um único ambiente o **atendimento, despacho, ocorrências, viaturas, equipes, postos, plantões, itens operacionais, histórico e relatórios**.

A interface foi pensada para uso operacional, com foco em **clareza, rapidez, rastreabilidade e controle de acesso**.

<p align="center">
  <img src="IMG/Captura de tela 2026-10-03 214509.png" alt="Prévia do Guardião GCM" width="900">
</p>

> 🔵🔴 A identidade visual utiliza elementos inspirados na operação de emergência, incluindo efeitos de giroflex, ícones operacionais e recursos visuais próprios do projeto.

---

## 🌐 Acesso

### ▶️ Sistema
**https://devkove.github.io/guardiaogcm/**

### 💻 Repositório
**https://github.com/DevKove/guardiaogcm**

O frontend é publicado pelo **GitHub Pages** e a camada de dados, autenticação e regras de segurança utiliza **Supabase**.

---

# 🖥️ Módulos do sistema

| Módulo | Principais recursos |
|---|---|
| 🚨 **Ocorrências** | Cadastro, classificação, despacho, chegada, atendimento, encerramento e histórico |
| 🕐 **Plantão** | Abertura, acompanhamento em tempo real, registros, observações, equipe e encerramento |
| 🚓 **Viaturas** | Cadastro, prefixo, placa, status, guarnição, quilometragem e disponibilidade |
| 👮 **Equipe** | Gestão de agentes, funções, equipes e vinculações operacionais |
| 📍 **Postos fixos** | Cadastro, localização, responsáveis, horários e status |
| 📊 **Relatórios** | Relatórios operacionais, histórico e documentos para impressão |
| 🗂️ **Histórico** | Consulta e acompanhamento das operações realizadas |
| 🧰 **Itens** | Controle operacional de armas, rádios e itens cadastrados |
| 👤 **Usuários** | Perfis, permissões e administração de acesso |

---

# 🕐 Plantão operacional

O **Plantão** é o centro do acompanhamento operacional.

### Recursos

- Abertura e encerramento do plantão.
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
- Registros manuais.
- **Atualização em tempo real.**
- **Outras observações.**
- Histórico do plantão.
- Relatório do plantão.
- Assinatura e impressão.

### 🔄 Atualização em tempo real

O acompanhamento em tempo real permanece **exclusivamente dentro da área Plantão**, mantendo Ocorrências focada no atendimento e despacho.

---

# 🚨 Atendimento e ocorrências

O módulo de ocorrências permite acompanhar o atendimento desde o recebimento até o encerramento.

**Fluxo operacional:**

```
📞 Atendimento
      ↓
📝 Nova ocorrência
      ↓
🏷️ Classificação
      ↓
🚓 Despacho
      ↓
📍 Chegada ao local
      ↓
👮 Atendimento
      ↓
✅ Encerramento
      ↓
📚 Histórico
```

Inclui:

- Natureza e prioridade.
- Origem da solicitação.
- Dados do solicitante.
- Endereço, bairro e referência.
- Relato.
- Envolvidos.
- Viatura vinculada.
- Despacho.
- Horário de chegada.
- Desfecho.
- Observações.
- Histórico.
- Impressão.

---

# 🧰 Itens operacionais

O sistema possui área própria para gerenciamento de itens utilizados durante o serviço.

### 🔫 Armas
Controle de itens de armamento e movimentações durante o plantão.

### 📻 Rádios
Controle dos equipamentos de comunicação.

### 🖥️ CAD
Controle de outros itens cadastrados pela administração.

O objetivo é permitir rastreabilidade sobre **quem retirou, quando retirou, quando devolveu e em qual plantão ocorreu a movimentação**.

---

# 📊 Relatórios e histórico

O Guardião GCM mantém registros para facilitar a consulta posterior e a geração de documentos operacionais.

### Relatórios

- Relatório de plantão.
- Registros operacionais.
- Ocorrências.
- Histórico.
- Informações registradas durante o serviço.
- Impressão em formato adequado para documentação.

### 🖨️ Documentos

Os relatórios são preparados para impressão, com estrutura limpa e adequada para utilização administrativa.

---

# 🔐 Segurança

A segurança é aplicada principalmente no **backend**, e não apenas na interface.

### Controles utilizados

- 🔒 Supabase Auth.
- 🛡️ Row Level Security (RLS).
- 👤 Perfis e funções de usuário.
- ⚙️ Operações administrativas protegidas.
- 🧩 Supabase Edge Functions.
- 🗄️ PostgreSQL.
- 🔑 Chave pública própria para utilização no frontend.

> ⚠️ **Nunca coloque uma chave `service_role` ou `sb_secret_` no frontend ou em variáveis `VITE_*`.**

O controle efetivo de autorização deve permanecer protegido pelas políticas e funções do banco.

---

# 🏗️ Arquitetura

## Frontend

- React
- TypeScript
- TanStack Router
- TanStack Query
- Vite
- Tailwind CSS
- Radix UI
- Lucide React

## Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Edge Functions
- Row Level Security

## Publicação

```
┌─────────────────────┐
│      GitHub         │
│     Repository      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   GitHub Actions    │
│       Build         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    GitHub Pages     │
│      Frontend       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      Supabase       │
│ Auth + PostgreSQL   │
│ + Edge Functions    │
└─────────────────────┘
```

---

# 🗄️ Banco de dados

Entre as principais estruturas utilizadas:

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

# 👥 Perfis de acesso

| Perfil | Permissões |
|---|---|
| 🛡️ **Administrador** | Administração completa e gerenciamento operacional |
| ⭐ **Supervisor** | Operação e funções de supervisão autorizadas |
| 👮 **Operador** | Atendimento, ocorrências e operações permitidas |

> A interface não deve ser considerada a única camada de segurança. As permissões efetivas devem ser aplicadas pelo Supabase/RLS e pelas funções de autorização.

---

# 🎨 Identidade visual

O projeto utiliza uma identidade visual operacional com:

- 🔵 Azul institucional.
- 🔴 Vermelho de emergência.
- 🟡 Elementos de alerta.
- 🌑 Tema escuro.
- ☀️ Tema claro.
- ✨ Efeitos visuais e animações.
- 🚨 Elementos inspirados em giroflex.
- 🛡️ Identidade visual da Guarda Municipal.

O repositório mantém seus recursos gráficos na pasta `IMG/`, incluindo imagens e GIFs utilizados pelos módulos.

---

# 💻 Desenvolvimento local

### Requisitos

- Node.js
- npm ou Bun
- Projeto Supabase para desenvolvimento

### Clonar

```bash
git clone https://github.com/DevKove/guardiaogcm.git
cd guardiaogcm
```

### Instalar

```bash
npm install
```

ou:

```bash
bun install
```

### Configurar ambiente

Crie `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

### Executar

```bash
npm run dev
```

ou:

```bash
bun run dev
```

---

# 📦 Build

```bash
npm run build
```

ou:

```bash
bun run build
```

A aplicação utiliza a base:

```
/guardiaogcm/
```

para publicação no GitHub Pages.

---

# 🚀 Deploy

O projeto possui fluxo de publicação automatizado pelo **GitHub Actions**.

```
Alteração no código
       ↓
Git push
       ↓
GitHub Actions
       ↓
Build
       ↓
GitHub Pages
       ↓
Aplicação publicada
```

---

# 🧭 Fluxo operacional recomendado

```
🔐 Login
  ↓
🕐 Abrir Plantão
  ↓
📡 Acompanhar Plantão em tempo real
  ↓
📞 Atendimento
  ↓
🚨 Nova Ocorrência
  ↓
🚓 Despacho
  ↓
📍 Chegada
  ↓
👮 Atendimento
  ↓
✅ Encerramento
  ↓
📚 Histórico
  ↓
📄 Relatório
  ↓
🕐 Encerramento do Plantão
```

---

# 📌 Status

<p align="center">
  <img src="https://img.shields.io/badge/Projeto-Guardião%20GCM-0f172a?style=for-the-badge">
  <img src="https://img.shields.io/badge/Operação-CAD-1d4ed8?style=for-the-badge">
  <img src="https://img.shields.io/badge/Segurança-RLS-059669?style=for-the-badge">
  <img src="https://img.shields.io/badge/Backend-Supabase-16a34a?style=for-the-badge">
</p>

O sistema está em **desenvolvimento e validação contínua**, com frontend publicado no GitHub Pages, backend no Supabase e pipeline de build/deploy automatizado.

Antes de considerar o sistema definitivamente homologado para uso operacional, todos os fluxos devem continuar sendo testados em ambiente controlado.

---

# 📄 Licença

Projeto privado/de uso controlado.

A redistribuição, modificação ou utilização do sistema em outro ambiente deve ser autorizada pelos responsáveis pelo repositório.

---

<p align="center">
  <strong>🛡️ Guardião GCM</strong><br>
  <sub>Central de Atendimento e Despacho · Guarda Civil Municipal de Araçoiaba da Serra — SP</sub>
</p>

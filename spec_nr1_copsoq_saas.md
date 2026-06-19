# SPEC — Sistema SaaS NR-1 Psicossocial (COPSOQ II-BR)
**Versão:** 2.0 | **Mercado:** Brasil | **Instrumento:** COPSOQ II-BR (Gonçalves et al., 2021)

---

## SEÇÃO 1 — FUNDAMENTOS DO PRODUTO

### 1.1 Visão e Problema

A Portaria MTE nº 1.419/2024 tornou obrigatória a inclusão de Fatores de Risco Psicossocial Relacionados ao Trabalho (FRPRT) no PGR de toda empresa CLT, com fiscalização a partir de 26 de maio de 2026. Profissionais responsáveis por essa avaliação (psicólogos, consultores SST, médicos do trabalho) operam atualmente via planilhas e Google Forms — resultando em erros de cálculo de escore, ausência de anonimato comprovável (LGPD), documentação não padronizada para fiscalização e incapacidade de escalar atendimento a múltiplos clientes.

**Solução:** Plataforma web SaaS multi-tenant voltada ao profissional consultor. Automatiza o ciclo completo: configuração da aplicação → coleta anônima → pontuação COPSOQ II-BR → dashboard analítico → documentação PGR-ready (PDF/DOCX) com inventário de riscos e plano de ação 5W2H. Um profissional gerencia múltiplos clientes em um único painel.

### 1.2 Atores do Sistema

**Profissional (ator primário, autenticado):** Psicólogo, técnico/engenheiro de segurança do trabalho, médico do trabalho. Consultor externo ou interno. Único usuário com conta no sistema. Gerencia empresas clientes, configura avaliações, interpreta resultados e gera documentação.

**Trabalhador (ator secundário, passivo):** Responde ao questionário via link anônimo. Sem conta, sem acesso ao sistema, sem dados pessoais registrados.

**Gestor da empresa cliente (ator terciário, passivo):** Recebe relatório PDF final por e-mail ou entrega física. Sem acesso ao sistema.

### 1.3 Navegação Principal (Mapeamento de Módulos de UI)

```
Sidebar da aplicação principal (app.dominio.com):
  ├── Painel           → MÓDULO 12
  ├── Empresas         → MÓDULO 4
  ├── Avaliações       → MÓDULO 5  (contexto de empresa selecionada)
  ├── Resultados       → MÓDULO 8  (contexto de avaliação selecionada)
  ├── Inventário       → MÓDULO 9  (contexto de avaliação selecionada)
  ├── Plano de Ação    → MÓDULO 10 (contexto de avaliação selecionada)
  ├── Relatório        → MÓDULO 11 (contexto de avaliação selecionada)
  └── Configurações    → MÓDULO 3 (perfil do profissional)

Portal separado (responder.dominio.com):
  └── Questionário     → MÓDULO 6  (sem auth, acesso por token)
```

---

## SEÇÃO 2 — DOMÍNIO REGULATÓRIO E TÉCNICO

### 2.1 Quadro Regulatório NR-1

| Documento | Conteúdo relevante para o sistema |
|---|---|
| NR-1 cap. 1.5 (Portaria MTE 1.419/2024) | Inclui FRPRT no GRO; exige identificação, avaliação e controle no PGR |
| Portaria MTE 765/2025 | Define prazo de vigência: 26/05/2026 |
| Guia MTE 2025 (FRPRT) | Lista 13 fatores reconhecidos; referencia COPSOQ como instrumento aceito |
| Lei 14.457/2022 | Canal de denúncias obrigatório para empresas com CIPA |
| LGPD (Lei 13.709/2018) | Anonimato dos respondentes é requisito legal, não opcional |

**GRO** (Gerenciamento de Riscos Ocupacionais): processo contínuo de identificação de perigos, avaliação e controle de riscos. Segue ciclo PDCA.

**PGR** (Programa de Gerenciamento de Riscos): documento que materializa o GRO. Componentes mínimos exigidos: (1) Inventário de Riscos, (2) Plano de Ação.

**GHE** (Grupo Homogêneo de Exposição): agrupamento de trabalhadores com exposição similar a determinado risco. Sinônimo operacional de "setor" ou "departamento" no contexto psicossocial. Unidade mínima de análise do COPSOQ II-BR.

**Inventário de Riscos** (NR-1, item 1.5.4.4): lista estruturada com perigo identificado, possíveis danos, GHE exposto, avaliação de risco (probabilidade × severidade), medidas de controle existentes e medidas preventivas propostas.

**Matriz de Risco:** `Nível = Probabilidade × Severidade`. Escala 1-3 × 1-3 → 9 combinações agrupadas em Baixo/Médio/Alto.

**Plano de Ação 5W2H:** What, Why, Who, Where, When, How, How much. Cada item do plano contém obrigatoriamente esses 7 campos.

**Participação dos trabalhadores** (NR-1 item 1.5.3.3): obrigatório registrar evidência de que trabalhadores foram consultados no processo. O sistema coleta e persiste esse registro como campo obrigatório para desbloqueio do relatório.

**Revisão do PGR:** obrigatória a cada 2 anos ou quando houver mudança significativa nos riscos. O sistema suporta múltiplos ciclos de avaliação por empresa.

### 2.2 Os 13 Fatores FRPRT do MTE (Guia 2025)

Referência para nomenclatura do inventário de riscos e para lacunas de cobertura do COPSOQ II-BR.

| # | Fator | Categoria |
|---|---|---|
| F1 | Sobrecarga e ritmo de trabalho | Organização do trabalho |
| F2 | Baixa autonomia/controle sobre o trabalho | Organização do trabalho |
| F3 | Jornadas prolongadas ou atípicas | Organização do trabalho |
| F4 | Trabalho monótono ou com baixo conteúdo | Organização do trabalho |
| F5 | Má qualidade da liderança | Relações sociais e liderança |
| F6 | Falta de apoio social (colegas/gestores) | Relações sociais e liderança |
| F7 | Assédio moral/sexual/violência | Relações sociais e liderança |
| F8 | Desequilíbrio esforço-recompensa | Recompensa e reconhecimento |
| F9 | Insegurança no emprego | Recompensa e reconhecimento |
| F10 | Comunicação organizacional deficiente | Comunicação e mudança |
| F11 | Gestão de mudanças inadequada | Comunicação e mudança |
| F12 | Conflito trabalho-família | Outros |
| F13 | Exposição a eventos traumáticos | Outros |

### 2.3 COPSOQ II-BR — Instrumento Principal

**Referência canônica:** Gonçalves JS, Moriguchi CS, Chaves TC, Sato TO. *Rev Saúde Pública.* 2021;55:69. DOI: 10.11606/s1518-8787.2021055003123

**Licença:** Creative Commons CC BY-NC-ND 4.0. Uso ocupacional permitido sem custo. Redação dos 40 itens é imutável — qualquer alteração invalida o instrumento científica e legalmente.

**Versão implementada:** Versão curta brasileira — 40 itens, 11 dimensões, ~15-20 min de aplicação. Recomendada para uso ocupacional em qualquer porte.

**Escala de resposta:** Likert 5 pontos — `1=Nunca/quase nunca · 2=Raramente · 3=Às vezes · 4=Frequentemente · 5=Sempre/quase sempre`

**Conversão item → escore 0-100:** `s_item = (valor_likert − 1) / 4 × 100`

**Escore da dimensão:** média aritmética dos escores dos itens que a compõem.

**Classificação de risco por dimensão:**

| Intervalo do escore de risco | Classificação | Semáforo |
|---|---|---|
| 0 – 33 | Favorável | Verde |
| 34 – 66 | Intermediário | Amarelo |
| 67 – 100 | Desfavorável | Vermelho |

**Inversão de direção:** dimensões onde escore bruto alto = condição favorável têm direção INVERTIDA. Para essas, `escore_risco = 100 − escore_bruto`. O sistema exibe ambos para o profissional, com label explícito distinguindo cada um.

**As 11 dimensões — mapeamento completo:**

| Cód | Dimensão | Itens (1-40) | N itens | Direção risco | Cobertura FRPRT MTE |
|---|---|---|---|---|---|
| D1 | Demandas no trabalho | 1–5 | 5 | DIRETO (alto=ruim) | F1 |
| D2 | Influência e desenvolvimento | 6–10 | 5 | INVERTIDO (alto=bom) | F2 |
| D3 | Significado e comprometimento | 11–14 | 4 | INVERTIDO | F4 |
| D4 | Valores no local de trabalho | 15–19 | 5 | INVERTIDO | F5, F7 |
| D5 | Liderança | 20–23 | 4 | INVERTIDO | F5 |
| D6 | Relações interpessoais | 24–27 | 4 | INVERTIDO | F6 |
| D7 | Saúde geral | 28–31 | 4 | INVERTIDO | — |
| D8 | Burnout e estresse | 32–35 | 4 | DIRETO (alto=ruim) | F1, F8 |
| D9 | Conflito trabalho-família | 36–37 | 2 | DIRETO | F12 |
| D10 | Satisfação no trabalho | 38–39 | 2 | INVERTIDO | F8, F9 |
| D11 | Comportamentos ofensivos | 40 | 1 | DIRETO | F7 |

**Cobertura:** ~8 dos 13 fatores MTE cobertos. Fatores F3, F9, F10, F11, F13 e parte do F8 ficam fora do COPSOQ II-BR. O módulo de Inventário de Riscos suporta preenchimento manual dessas lacunas via AEP (Avaliação Ergonômica Preliminar).

**Regra de anonimato — mínimo por GHE:** resultados de um GHE não são exibidos se N respondentes < 5. Dados desse GHE não entram em nenhum cálculo agregado. Interface exibe bloco ocultado com explicação.

**Confiabilidade (Cronbach's α):** calculado por dimensão. α < 0,50 → aviso de baixa confiabilidade no relatório (não bloqueia). α ≥ 0,70 → confiável.

**Taxa de adesão:** recomendada ≥ 70% por GHE. Abaixo de 60% → aviso de potencial viés de auto-seleção, registrado no relatório gerado.

### 2.4 Algoritmo de Pontuação Completo

```
// 1. Converter cada resposta Likert para escore de item [0, 100]
s_item(r) = (r − 1) / 4 × 100       onde r ∈ {1, 2, 3, 4, 5}

// 2. Calcular escore bruto da dimensão (média dos itens)
s_bruto(D) = mean( s_item(r_i) para todo i ∈ itens(D), todo respondente )

// 3. Aplicar direção para obter escore de risco
se D.direction == DIRETO:    s_risco(D) = s_bruto(D)
se D.direction == INVERTIDO: s_risco(D) = 100 − s_bruto(D)

// 4. Classificar nível de risco
s_risco ∈ [0, 33]  → LOW    (Favorável)
s_risco ∈ [34, 66] → MEDIUM (Intermediário)
s_risco ∈ [67, 100] → HIGH  (Desfavorável)

// 5. Calcular Cronbach's α para a dimensão (k itens, sobre os itens médios por respondente)
α = k/(k−1) × (1 − Σ var(s_item_i) / var(Σ s_item_i))
```

---

## SEÇÃO 3 — ARQUITETURA DO SISTEMA

### 3.1 Stack Técnico

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | SPA com rotas protegidas |
| Styling | TailwindCSS v4 + shadcn/ui | Design system acessível |
| State/data | TanStack Query v5 | Cache, polling, mutations |
| Roteamento | TanStack Router | Type-safe, file-based |
| Charts | Recharts | Heat maps, radar, bar |
| Backend | Elysia (Bun runtime) | Type-safe, Eden treaty |
| ORM | Drizzle ORM | SQL-first, type-safe |
| Banco | Neon (PostgreSQL serverless) | Branching por ambiente |
| Auth | Better Auth | Sessions, multi-tenant |
| E-mail | Resend | Links de questionário, notificações |
| Storage | Cloudflare R2 | Relatórios PDF/DOCX gerados |
| PDF | @react-pdf/renderer (server) | Geração server-side |
| DOCX | `docx` (npm) | .docx editável para profissional |
| Deploy | Fly.io (API) + Vercel (frontend) | CDN global para portal worker |

### 3.2 Separação de Contextos

**Aplicação principal** (`app.dominio.com`): autenticação obrigatória via Better Auth session. Exclusivo para o profissional.

**Portal do trabalhador** (`responder.dominio.com`): sem autenticação. Zero cookies de sessão. Cookie-less. Zero fingerprinting. Mobile-first. Acesso somente por token UUID one-time.

### 3.3 Modelo Multi-Tenant

Isolamento **lógico** (row-level por `professional_id` em todas as entidades de negócio). Não há isolamento de schema por tenant. PostgreSQL RLS habilitado em tabelas sensíveis. Middleware de autorização centralizado no backend valida `professional_id` da sessão em todo acesso.

### 3.4 Hierarquia de Dados

```
professional
  └── company
        ├── department (GHE)
        └── assessment
              ├── assessment_department
              │     └── response_token
              │           └── response_answer (item × valor)
              ├── dimension_result (calculado por scoring engine)
              ├── risk_inventory_item (gerado + editável)
              ├── action_plan
              │     └── action_item (5W2H)
              └── report (PDF/DOCX gerado)
```

---

## SEÇÃO 4 — DESIGN SYSTEM E UX

### 4.1 Tokens de Cor

| Token | Hex | Aplicação |
|---|---|---|
| `--primary` | `#1E3A5F` | Nav ativa, CTAs primários, headers |
| `--primary-light` | `#2D5A8E` | Hover, badges primários |
| `--secondary` | `#2D6A4F` | Status conforme, confirmações |
| `--accent` | `#E07B39` | CTAs secundários, destaques |
| `--risk-high` | `#D44E3C` | Risco alto |
| `--risk-medium` | `#E8A020` | Risco médio |
| `--risk-low` | `#3D8C6B` | Risco baixo/favorável |
| `--surface` | `#F7F9FC` | Background global |
| `--surface-card` | `#FFFFFF` | Cards, modais, painéis |
| `--border` | `#DDE3EC` | Bordas, separadores |
| `--text-primary` | `#1A2535` | Texto principal |
| `--text-muted` | `#64748B` | Labels, descrições, legendas |

### 4.2 Tipografia

- **Inter 700/800** — títulos de seção, nomes de empresa, nomes de dimensão em destaque.
- **Inter 400/500** — todo conteúdo de interface, body text.
- **IBM Plex Mono 400** — CNPJs, escores numéricos, tokens, datas ISO, identificadores técnicos.
- **Escala:** 11px (label micro), 13px (caption), 14px (body sm), 16px (body), 20px (h4), 24px (h3), 32px (h2).

### 4.3 Componentes Específicos do Domínio

**`RiskBadge`:** chip inline `● ALTO / MÉDIO / BAIXO` com background sólido por nível. Variantes `sm` (tabelas), `md` (cards), `lg` (headers). Não usar apenas cor — sempre incluir label textual (acessibilidade).

**`ScoreCell`** (heat map): `<td>` com background interpolado verde→amarelo→vermelho por `risk_score`. Texto branco quando `risk_score > 50`. Hover: tooltip com escore numérico, N respondentes, classificação.

**`DimensionRadar`:** RadarChart Recharts, 11 eixos normalizados 0-100. Area fill `opacity: 0.3`. Cor por GHE (paleta distinta se múltiplos GHEs sobrepostos). Eixos rotulados com nomes abreviados das dimensões.

**`AdesaoRing`:** anel SVG animado mostrando % de adesão global. Cor: cinza (<30%) → `--risk-medium` (30–69%) → `--risk-low` (≥70%).

**`WorkerQuestionItem`:** tela full-screen no portal. Texto da questão em destaque. 5 botões de resposta com `min-height: 56px` (touch-friendly). Sem sidebar, sem branding exceto rodapé discreto "Pesquisa confidencial — suas respostas são anônimas".

### 4.4 Princípios de UX do Domínio

**Linguagem não-clínica:** o sistema avalia riscos organizacionais, não diagnostica trabalhadores. Evitar "diagnóstico", "transtorno", "doença". Usar "fator de risco", "dimensão psicossocial", "condições de trabalho".

**Anonimato visível:** no portal do trabalhador, reforçar anonimato em boas-vindas, durante a aplicação (rodapé) e na finalização. No painel do profissional, badge "Dados anonimizados" próximo a resultados por GHE.

**Dualidade escore bruto vs. risco:** visualizações técnicas sempre exibem os dois com labels explícitas: "Escore bruto: 72 / Escore de risco: 28 (invertido)".

**Conformidade sempre visível:** badge de status NR-1 em cards de empresa e de avaliação — "Sem avaliação" / "Em andamento" / "Concluída" / "Revisão recomendada" (se última avaliação > 2 anos).

**Estados vazios como CTA:** nunca exibir tela vazia sem ação clara. "Nenhum ciclo de avaliação. A NR-1 exige avaliação psicossocial. [+ Iniciar Avaliação]"

### 4.5 Navegação e Layout

Sidebar colapsável (ícone-only em telas < 1024px). Breadcrumb em todas as páginas internas. Profundidade máxima: Empresas › [Nome da Empresa] › Avaliações › [Ciclo] › Resultados. Em mobile, sidebar → drawer inferior.

---

## SEÇÃO 5 — CONVENÇÕES GLOBAIS DE API

- **Base path:** `/api/v1`
- **Auth:** Cookie de sessão Better Auth (`httpOnly`, `secure`, `sameSite=Strict`). Todas as rotas exceto `/auth/*` e `/respond/*` exigem sessão válida.
- **Formato:** JSON. `Content-Type: application/json`.
- **Paginação:** `?page=1&limit=20` → `{data: [], meta: {total, page, limit, pages}}`.
- **Erros:** `{error: {code: string, message: string, details?: object}}`.

**Códigos de erro customizados:**
```
COMPANY_NOT_FOUND          DEPARTMENT_HAS_ACTIVE_ASSESSMENT
ASSESSMENT_NOT_DRAFT       ASSESSMENT_NOT_COLLECTING        ASSESSMENT_NOT_COMPLETED
TOKEN_ALREADY_USED         TOKEN_INVALID                    TOKEN_ASSESSMENT_CLOSED
GHE_BELOW_MINIMUM_RESPONSES                                 CNPJ_INVALID
REPORT_PREREQUISITES_UNMET PARTICIPATION_NOT_REGISTERED
PROFESSIONAL_NOT_FOUND     UNAUTHORIZED_TENANT_ACCESS
```

---

## SEÇÃO 6 — REGRAS DE NEGÓCIO TRANSVERSAIS

**RB-01 — Imutabilidade de respostas:** Após token marcado `used`, os 40 `response_answers` são imutáveis. Nenhum endpoint permite edição de `response_answers`.

**RB-02 — Isolamento de tenant:** Todo acesso a company, department, assessment, token, result é validado contra `professional_id` da sessão. Middleware centralizado, executado antes de qualquer handler de rota de negócio.

**RB-03 — Proteção de anonimato:** Nenhum endpoint retorna `response_answers` individualmente. Dados de resposta são acessíveis apenas via cálculo agregado no scoring engine. Endpoint de resultados nunca permite correlação resposta↔trabalhador.

**RB-04 — Pré-requisitos do relatório:** Relatório bloqueado até que: (a) `assessment.status = 'completed'`, (b) `assessment.participation_registration` preenchido, (c) existe ≥ 1 GHE elegível (`n_responses ≥ 5`).

**RB-05 — Redação COPSOQ inalterável:** Os 40 itens são seed data readonly. Nenhuma rota permite edição. Qualquer modificação invalida o instrumento (CC BY-NC-ND 4.0 + requisito de validação científica).

**RB-06 — Scoring idempotente:** O scoring engine faz upsert em `dimension_results`. Pode ser executado múltiplas vezes no mesmo assessment sem efeitos colaterais.

**RB-07 — Encerramento automático:** Job cron (a cada hora). Assessments com `end_date < now()` e `status = 'collecting'` são encerrados automaticamente e têm scoring acionado.

**RB-08 — Soft delete com proteção:** Empresa e departamento com `assessment.status IN ('collecting', 'processing')` não podem ser excluídos — retornar erro `DEPARTMENT_HAS_ACTIVE_ASSESSMENT`.

**RB-09 — Adesão e relatório:** Se taxa de adesão global < 60%, relatório inclui seção de limitações com aviso explícito de potencial viés. Não bloqueia a geração.

**RB-10 — Elegibilidade de GHE:** `assessment_department.is_eligible` é recalculado pelo scoring engine. GHE inelegível: nenhum dado seus entra em cálculo de médias da empresa; nenhum resultado seu é exibido ao profissional.

---

## MÓDULOS DE IMPLEMENTAÇÃO

> Cada módulo é uma **unidade de entrega independente** com escopo definido, dependências explícitas e critério de conclusão verificável. A ordem numérica é a sequência recomendada de implementação. Módulos sem dependência de UI (0, 1) são puramente de infraestrutura. Módulos com UI (3-12) correspondem cada um a uma seção coesa da aplicação.

---

## MÓDULO 0 — ESTRUTURA DO PROJETO

**Escopo:** Repositório, tooling, ambientes, CI/CD, configuração de serviços externos. Nenhuma feature de negócio. Entregável: ambiente de desenvolvimento funcional e pipeline de deploy operacional.

**Dependências:** nenhuma.

### 0.1 Estrutura de Repositório

```
/
├── apps/
│   ├── web/          → React + Vite (frontend principal)
│   ├── worker/       → React + Vite (portal do trabalhador — build separado)
│   └── api/          → Elysia + Bun (backend)
├── packages/
│   ├── db/           → Drizzle schema + migrations + seed
│   ├── types/        → tipos TypeScript compartilhados (DTOs, enums)
│   └── validators/   → schemas Zod compartilhados
├── turbo.json
├── package.json (workspace root)
└── .env.example
```

Monorepo gerenciado via **Turborepo**. Packagemanager: **Bun workspaces**.

### 0.2 Configuração de Ambientes

| Ambiente | Branch | Neon Branch | Deploy |
|---|---|---|---|
| development | local | `dev` | localhost |
| staging | `develop` | `staging` | Fly.io (staging) + Vercel preview |
| production | `main` | `main` | Fly.io (prod) + Vercel prod |

Variáveis de ambiente gerenciadas via **Infisical** (ou `.env` local). Nunca commitadas.

**Variáveis requeridas:**
```
DATABASE_URL          → Neon connection string
BETTER_AUTH_SECRET    → 32+ chars random
RESEND_API_KEY
R2_ACCOUNT_ID / R2_ACCESS_KEY / R2_SECRET_KEY / R2_BUCKET_NAME / R2_PUBLIC_URL
APP_URL               → URL do frontend principal
WORKER_APP_URL        → URL do portal do trabalhador
```

### 0.3 CI/CD (GitHub Actions)

- **PR para `develop`:** lint + type-check + unit tests. Build das apps.
- **Push em `develop`:** deploy em staging.
- **Push em `main`:** `drizzle-kit migrate` no banco prod (necessita aprovação manual) → deploy prod.

### 0.4 Scripts do Projeto

```json
"dev"     : "turbo dev"                    // inicia todos os apps em paralelo
"build"   : "turbo build"
"db:push" : "cd packages/db && drizzle-kit push"
"db:migrate": "cd packages/db && drizzle-kit migrate"
"db:studio": "cd packages/db && drizzle-kit studio"
"db:seed" : "bun packages/db/seed/index.ts"
```

### 0.5 Critério de Conclusão

- [ ] `bun dev` sobe os 3 apps sem erros
- [ ] `bun db:push` aplica schema no banco dev
- [ ] `bun db:seed` popula dados sem erros
- [ ] Deploy de staging funcional via push em `develop`

---

## MÓDULO 1 — BANCO DE DADOS

**Escopo:** Schema completo, migrations, seed de dados estáticos (COPSOQ II-BR itens e dimensões). Nenhuma lógica de negócio. Entregável: banco estruturado e seed verificável.

**Dependências:** MÓDULO 0.

### 1.1 Schema Drizzle ORM — Tabelas

```typescript
// packages/db/schema.ts

// ── PROFISSIONAL ──────────────────────────────────────────────────
export const professionals = pgTable('professionals', {
  id:                uuid('id').primaryKey().defaultRandom(),
  userId:            uuid('user_id').notNull().references(() => users.id),
  name:              text('name').notNull(),
  professionType:    professionTypeEnum('profession_type').notNull(),
  // 'psychologist' | 'sst_engineer' | 'sst_technician' | 'occupational_physician' | 'other'
  credentialNumber:  text('credential_number'),        // CRP, CREA, CRM, etc.
  phone:             text('phone'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
});

// ── EMPRESA CLIENTE ───────────────────────────────────────────────
export const companies = pgTable('companies', {
  id:              uuid('id').primaryKey().defaultRandom(),
  professionalId:  uuid('professional_id').notNull().references(() => professionals.id),
  name:            text('name').notNull(),
  cnpj:            text('cnpj').notNull().unique(),      // 14 dígitos, validado
  cnaePrimary:     text('cnae_primary'),
  employeeCount:   integer('employee_count'),
  city:            text('city'),
  state:           char('state', { length: 2 }),
  contactName:     text('contact_name'),
  contactEmail:    text('contact_email'),
  contactPhone:    text('contact_phone'),
  dpoPoc:          text('dpo_poc'),                     // DPO/responsável LGPD da empresa cliente
  isActive:        boolean('is_active').default(true).notNull(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});

// ── DEPARTAMENTO / GHE ────────────────────────────────────────────
export const departments = pgTable('departments', {
  id:           uuid('id').primaryKey().defaultRandom(),
  companyId:    uuid('company_id').notNull().references(() => companies.id),
  name:         text('name').notNull(),
  description:  text('description'),
  workerCount:  integer('worker_count').notNull(),
  isActive:     boolean('is_active').default(true).notNull(),
});

// ── AVALIAÇÃO (CICLO) ─────────────────────────────────────────────
export const assessments = pgTable('assessments', {
  id:                        uuid('id').primaryKey().defaultRandom(),
  companyId:                 uuid('company_id').notNull().references(() => companies.id),
  professionalId:            uuid('professional_id').notNull().references(() => professionals.id),
  instrument:                text('instrument').default('COPSOQ2_BR_SHORT').notNull(),
  title:                     text('title').notNull(),
  status:                    assessmentStatusEnum('status').default('draft').notNull(),
  // 'draft' | 'collecting' | 'processing' | 'completed' | 'archived'
  startDate:                 date('start_date'),
  endDate:                   date('end_date'),
  participationRegistration: text('participation_registration'),  // evidência obrigatória
  workerCommunicationSentAt: timestamp('worker_communication_sent_at'),
  createdAt:                 timestamp('created_at').defaultNow().notNull(),
  completedAt:               timestamp('completed_at'),
});

// ── ASSESSMENT × DEPARTAMENTO ─────────────────────────────────────
export const assessmentDepartments = pgTable('assessment_departments', {
  id:                uuid('id').primaryKey().defaultRandom(),
  assessmentId:      uuid('assessment_id').notNull().references(() => assessments.id),
  departmentId:      uuid('department_id').notNull().references(() => departments.id),
  expectedResponses: integer('expected_responses').notNull(),
  tokenCount:        integer('token_count').default(0).notNull(),
  responseCount:     integer('response_count').default(0).notNull(),
  isEligible:        boolean('is_eligible').default(false).notNull(), // responseCount >= 5
});

// ── TOKEN ANÔNIMO ─────────────────────────────────────────────────
export const responseTokens = pgTable('response_tokens', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  assessmentDepartmentId: uuid('assessment_department_id').notNull()
                          .references(() => assessmentDepartments.id),
  token:                 text('token').notNull().unique(),  // UUID v4
  isUsed:                boolean('is_used').default(false).notNull(),
  usedAt:                timestamp('used_at'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
  // NENHUM dado de trabalhador. Token não é rastreável a indivíduo.
});

// ── RESPOSTA INDIVIDUAL ───────────────────────────────────────────
export const responseAnswers = pgTable('response_answers', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tokenId:      uuid('token_id').notNull().references(() => responseTokens.id),
  itemIndex:    smallint('item_index').notNull(),   // 1-40
  likertValue:  smallint('likert_value').notNull(), // 1-5
  answeredAt:   timestamp('answered_at').defaultNow().notNull(),
}, (t) => ({
  uniqueTokenItem: unique().on(t.tokenId, t.itemIndex),
}));

// ── RESULTADO POR DIMENSÃO × GHE ─────────────────────────────────
export const dimensionResults = pgTable('dimension_results', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  assessmentDepartmentId: uuid('assessment_department_id').notNull()
                          .references(() => assessmentDepartments.id),
  dimensionCode:          dimensionCodeEnum('dimension_code').notNull(),
  // 'D1' | 'D2' | ... | 'D11'
  rawScore:               numeric('raw_score', { precision: 5, scale: 2 }).notNull(),
  riskScore:              numeric('risk_score', { precision: 5, scale: 2 }).notNull(),
  riskLevel:              riskLevelEnum('risk_level').notNull(), // 'LOW' | 'MEDIUM' | 'HIGH'
  cronbachAlpha:          numeric('cronbach_alpha', { precision: 4, scale: 3 }),
  nResponses:             integer('n_responses').notNull(),
  calculatedAt:           timestamp('calculated_at').defaultNow().notNull(),
}, (t) => ({
  uniqueAssessmentDimension: unique().on(t.assessmentDepartmentId, t.dimensionCode),
}));

// ── INVENTÁRIO DE RISCOS ──────────────────────────────────────────
export const riskInventoryItems = pgTable('risk_inventory_items', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  assessmentId:           uuid('assessment_id').notNull().references(() => assessments.id),
  assessmentDepartmentId: uuid('assessment_department_id')
                          .references(() => assessmentDepartments.id), // null = empresa toda
  dimensionCode:          dimensionCodeEnum('dimension_code'),          // null = risco manual
  mteFactorCode:          text('mte_factor_code'),                      // ex: 'F1', 'F9'
  isManual:               boolean('is_manual').default(false).notNull(), // AEP manual
  hazardDescription:      text('hazard_description').notNull(),
  possibleHarms:          text('possible_harms').notNull(),
  probability:            smallint('probability').notNull(),  // 1-3
  severity:               smallint('severity').notNull(),     // 1-3
  // riskLevel calculado: (probability * severity) → LOW(1-2) | MEDIUM(3-4) | HIGH(6-9)
  existingControls:       text('existing_controls'),
  proposedMeasures:       text('proposed_measures'),
  createdAt:              timestamp('created_at').defaultNow().notNull(),
  updatedAt:              timestamp('updated_at').defaultNow().notNull(),
});

// ── PLANO DE AÇÃO ─────────────────────────────────────────────────
export const actionPlans = pgTable('action_plans', {
  id:           uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id').notNull().unique().references(() => assessments.id),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
});

export const actionItems = pgTable('action_items', {
  id:               uuid('id').primaryKey().defaultRandom(),
  actionPlanId:     uuid('action_plan_id').notNull().references(() => actionPlans.id),
  departmentId:     uuid('department_id').references(() => departments.id), // null = empresa toda
  dimensionCode:    dimensionCodeEnum('dimension_code'),    // null = ação geral
  riskLevelTrigger: riskLevelEnum('risk_level_trigger'),
  what:             text('what').notNull(),
  why:              text('why').notNull(),
  who:              text('who').notNull(),
  where:            text('where').notNull(),
  whenDate:         date('when_date').notNull(),
  how:              text('how').notNull(),
  estimatedCost:    numeric('estimated_cost', { precision: 10, scale: 2 }),
  status:           actionStatusEnum('status').default('pending').notNull(),
  // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
});

// ── RELATÓRIO GERADO ──────────────────────────────────────────────
export const reports = pgTable('reports', {
  id:             uuid('id').primaryKey().defaultRandom(),
  assessmentId:   uuid('assessment_id').notNull().references(() => assessments.id),
  type:           reportTypeEnum('type').notNull(), // 'pdf' | 'docx'
  storageKey:     text('storage_key').notNull(),    // Cloudflare R2 key
  fileSizeBytes:  integer('file_size_bytes'),
  generatedAt:    timestamp('generated_at').defaultNow().notNull(),
  downloadUrl:    text('download_url'),             // URL pré-assinada
  urlExpiresAt:   timestamp('url_expires_at'),
});

// ── SEED: ITENS COPSOQ II-BR (readonly) ───────────────────────────
export const copsoqItems = pgTable('copsoq_items', {
  index:           smallint('index').primaryKey(),   // 1-40
  dimensionCode:   dimensionCodeEnum('dimension_code').notNull(),
  textPtBr:        text('text_pt_br').notNull(),     // redação exata Gonçalves et al. 2021
  responseType:    text('response_type').notNull(),  // 'frequency' | 'degree' | 'agreement'
  orderInDimension: smallint('order_in_dimension').notNull(),
});

export const copsoqDimensions = pgTable('copsoq_dimensions', {
  code:              dimensionCodeEnum('code').primaryKey(),
  namePtBr:          text('name_pt_br').notNull(),
  groupName:         text('group_name').notNull(),   // ex: "Demandas no trabalho"
  itemCount:         smallint('item_count').notNull(),
  direction:         directionEnum('direction').notNull(), // 'DIRECT' | 'INVERTED'
  descriptionPtBr:   text('description_pt_br').notNull(),
  mteFactorsCovered: text('mte_factors_covered').array(), // ex: ['F1', 'F2']
});
```

### 1.2 Índices

```sql
CREATE INDEX idx_companies_professional ON companies(professional_id);
CREATE INDEX idx_departments_company ON departments(company_id);
CREATE INDEX idx_assessments_company_status ON assessments(company_id, status);
CREATE INDEX idx_assessments_professional ON assessments(professional_id);
CREATE INDEX idx_assessment_depts_assessment ON assessment_departments(assessment_id);
CREATE INDEX idx_response_tokens_token ON response_tokens(token);        -- hot path worker portal
CREATE INDEX idx_response_tokens_dept ON response_tokens(assessment_department_id, is_used);
CREATE INDEX idx_response_answers_token ON response_answers(token_id);
CREATE INDEX idx_dimension_results_dept ON dimension_results(assessment_department_id);
CREATE INDEX idx_risk_inventory_assessment ON risk_inventory_items(assessment_id);
CREATE INDEX idx_action_items_plan_status ON action_items(action_plan_id, status);
```

### 1.3 Seed de Dados

`packages/db/seed/copsoq.ts` — popula `copsoq_items` (40 registros) e `copsoq_dimensions` (11 registros) com a redação exata da publicação Gonçalves et al. 2021, Apêndice VIII da tese UFSCar 2019. Esse seed é **imutável em produção** — nunca sobrescrito por migrations subsequentes.

### 1.4 Critério de Conclusão

- [ ] `drizzle-kit generate` cria migration sem erros
- [ ] `drizzle-kit migrate` aplica no banco dev sem erros
- [ ] `bun db:seed` popula 40 itens e 11 dimensões COPSOQ
- [ ] `drizzle-kit studio` exibe todas as tabelas com dados seed
- [ ] Constraints unique e FK testadas (insert inválido retorna erro esperado)

---

## MÓDULO 2 — AUTENTICAÇÃO

**Escopo:** Registro de conta, login, sessão, recuperação de senha, perfil do profissional. Entregável: profissional consegue criar conta, autenticar-se e gerenciar seu perfil.

**Dependências:** MÓDULO 0, MÓDULO 1.

### 2.1 Configuração Better Auth

```typescript
// apps/api/src/auth.ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7,          // 7 dias
    updateAge: 60 * 60 * 24,               // renova sessão a cada 24h de atividade
    cookieCache: { enabled: true, maxAge: 5 * 60 }
  },
  cookies: { secure: true, sameSite: 'strict', httpOnly: true },
});
```

Após criação de usuário via Better Auth, hook `user.created` cria registro em `professionals` com `userId` vinculado.

### 2.2 Páginas Frontend

| Rota | Descrição |
|---|---|
| `/auth/login` | Email + senha. Link "Esqueci a senha". CTA "Criar conta". |
| `/auth/register` | Nome completo, tipo de profissão (select), credencial profissional (opcional), email, senha, checkbox aceite LGPD/termos. |
| `/auth/verificar-email` | Instrução pós-cadastro: "Confirme seu e-mail para continuar." |
| `/auth/esqueci-senha` | Campo email → envia magic link de redefinição. |
| `/auth/redefinir-senha/:token` | Campos nova senha + confirmação. |
| `/configuracoes/perfil` | Nome, tipo profissão, credencial, telefone. |

**Redirecionamento:** usuário autenticado acessando `/auth/*` → redireciona para `/painel`. Usuário não autenticado acessando rota protegida → redireciona para `/auth/login?redirect=<rota>`.

### 2.3 Endpoints Backend

```
POST /auth/register          → cria better_auth user + professionals row (transação)
POST /auth/login             → better_auth session
POST /auth/logout            → invalida sessão
POST /auth/forgot-password   → gera token JWT (exp 1h); envia email Resend
POST /auth/reset-password    → valida JWT; atualiza hash senha
GET  /auth/verify-email/:token → confirma email
GET  /professionals/me       → retorna professional (inclui professionType, credential)
PATCH /professionals/me      → atualiza nome, profissionType, credentialNumber, phone
```

### 2.4 Middleware de Autorização

```typescript
// apps/api/src/middleware/auth.ts
// Executado antes de todo handler de rota de negócio:
// 1. Extrai session cookie
// 2. Valida sessão via better_auth
// 3. Busca professional por session.userId
// 4. Injeta ctx.professional no contexto da request
// 5. Se inválido → 401 UNAUTHORIZED
```

### 2.5 Critério de Conclusão

- [ ] Registro cria usuário e professional; e-mail de confirmação é enviado via Resend
- [ ] Login com credenciais válidas retorna cookie de sessão
- [ ] Rota `/professionals/me` retorna dados do profissional autenticado
- [ ] Rota protegida sem sessão retorna 401
- [ ] Fluxo de redefinição de senha funciona end-to-end
- [ ] Logout invalida sessão; requests subsequentes retornam 401

---

## MÓDULO 3 — CONFIGURAÇÕES (PERFIL DO PROFISSIONAL)

**Escopo:** Página de configurações — dados do perfil, credencial profissional, informações de conta. Não inclui billing. Entregável: profissional consegue editar e salvar seu perfil.

**Dependências:** MÓDULO 2.

### 3.1 Página `/configuracoes`

Seções (layout com tabs ou seções verticais):

**Perfil profissional:**
- Nome completo (text input)
- Tipo de profissão (select: Psicólogo, Técnico SST, Engenheiro SST, Médico do Trabalho, Outro)
- Número de credencial (text: CRP, CREA, CRM conforme tipo selecionado — label muda dinamicamente)
- Telefone (text, formato BR)
- [Salvar Perfil]

**Conta:**
- Email cadastrado (readonly, com badge "verificado" / "não verificado")
- [Alterar Senha] → abre modal com campos "Senha atual", "Nova senha", "Confirmar nova senha"

### 3.2 Endpoints Backend

```
GET  /professionals/me           → dados atuais
PATCH /professionals/me          → atualiza campos de perfil
POST /professionals/me/change-password → {currentPassword, newPassword}
```

### 3.3 Critério de Conclusão

- [ ] Edição de perfil persiste no banco e reflete imediatamente na UI
- [ ] Alteração de senha valida senha atual antes de atualizar
- [ ] Label da credencial muda conforme tipo de profissão selecionado

---

## MÓDULO 4 — EMPRESAS

**Escopo:** CRUD completo de empresas clientes e seus departamentos (GHEs). Entregável: profissional consegue cadastrar e gerenciar empresas e departamentos.

**Dependências:** MÓDULO 2.

### 4.1 Páginas Frontend

**`/empresas`** — lista de empresas:
- Grid de cards (3 colunas desktop, 1 mobile). Busca por nome ou CNPJ.
- Card: nome da empresa, CNPJ mascarado (XX.XXX.XXX/XXXX-XX), nº funcionários, badge de status da avaliação mais recente, data da última avaliação.
- Botão "+ Nova Empresa" (header da página).
- Estado vazio: "Nenhuma empresa cadastrada. Adicione seu primeiro cliente."

**`/empresas/:id`** — detalhe da empresa:
- Header: nome, CNPJ, cidade/UF, CNAE, nº funcionários, contato.
- Tabs: **Visão Geral** | **Departamentos** | **Avaliações** (link para módulo 5).
- **Visão Geral**: KPIs — nº departamentos ativos, total de trabalhadores, último ciclo de avaliação (título + data), próxima revisão recomendada (último ciclo + 2 anos).
- **Departamentos**: tabela com nome, nº trabalhadores, status (ativo/inativo), ações (editar, desativar). Botão "+ Departamento".

**Formulário de empresa (modal ou drawer):**
- Campos: nome*, CNPJ* (com máscara e validação em tempo real), CNAE, nº funcionários, cidade, UF (select), nome do contato, e-mail do contato, telefone do contato, DPO/responsável LGPD (textarea opcional).
- Validação CNPJ: algoritmo de dígitos verificadores executado client-side e server-side.

**Formulário de departamento (modal):**
- Campos: nome do GHE*, descrição, nº de trabalhadores*.

### 4.2 Endpoints Backend

```
GET    /companies                          → lista paginada (professional_id da sessão)
POST   /companies                          → cria empresa; valida CNPJ
GET    /companies/:id                      → empresa + summary (depts count, last assessment)
PATCH  /companies/:id                      → atualiza campos
DELETE /companies/:id                      → soft delete (is_active=false); bloqueia se assessment ativo

GET    /companies/:id/departments          → lista departamentos ativos
POST   /companies/:id/departments          → cria GHE
PATCH  /companies/:id/departments/:deptId  → atualiza GHE
DELETE /companies/:id/departments/:deptId  → soft delete; bloqueia se assessment ativo
```

### 4.3 Regras Específicas

- CNPJ deve ter dígitos verificadores válidos. Retorna `CNPJ_INVALID` se inválido.
- Dois departamentos da mesma empresa não podem ter o mesmo nome (unique por `companyId`).
- Ao desativar empresa: assessments existentes não são afetados (apenas impede criação de novos).

### 4.4 Critério de Conclusão

- [ ] Criação de empresa valida CNPJ e bloqueia CNPJ inválido
- [ ] Listagem filtra corretamente por `professional_id` (tenant isolation)
- [ ] CRUD completo de departamentos funciona
- [ ] Soft delete de empresa bloqueia quando há assessment ativo
- [ ] Busca por nome e CNPJ funciona na listagem

---

## MÓDULO 5 — AVALIAÇÕES

**Escopo:** Criação e configuração de ciclos de avaliação, seleção de GHEs, geração de links, lançamento, monitoramento de progresso e encerramento. Entregável: profissional consegue lançar uma avaliação e acompanhar a coleta em tempo real.

**Dependências:** MÓDULO 4.

### 5.1 Páginas Frontend

**`/empresas/:id/avaliacoes`** — lista de ciclos:
- Tabela: título, instrumento, período, status (badge), taxa de adesão global, ações.
- Botão "+ Nova Avaliação".
- Estado vazio: "Nenhuma avaliação iniciada. [+ Iniciar Avaliação]".

**Wizard de criação — 3 etapas:**

**Etapa 1 — Configurar Ciclo:**
- Título do ciclo (ex: "1º Ciclo 2025"), obrigatório.
- Instrumento: `COPSOQ II-BR Versão Curta (40 itens)` — fixo, sem seleção no v1. Exibe descrição do instrumento.
- Data de início (padrão: hoje), Data de encerramento (obrigatória).

**Etapa 2 — Selecionar Departamentos:**
- Lista de GHEs ativos da empresa com checkbox. Exibe nome e nº de trabalhadores de cada.
- Para cada GHE selecionado: campo editável "Respondentes esperados" (pré-preenchido com `workerCount`).
- Aviso inline: "GHEs com menos de 5 respondentes não terão resultados exibidos individualmente."
- Mínimo 1 GHE selecionado para avançar.

**Etapa 3 — Revisão e Lançamento:**
- Resumo: ciclo, período, GHEs selecionados, total de respondentes esperados.
- Botão "Lançar Avaliação" → cria tokens e muda status para `collecting`.
- Após lançamento: exibe seção "Links de Coleta" por GHE (ver abaixo).

**`/avaliacoes/:id`** — detalhe do ciclo:
- Header: título, instrumento, período, status badge, taxa de adesão global (ring animado).
- Cards de GHE: nome, esperados, respondidos, % adesão, status de elegibilidade.
- Botão "Encerrar Coleta" (somente quando `status = 'collecting'`).
- Campo "Evidência de participação dos trabalhadores" (textarea, salva em `participationRegistration`) — obrigatório antes de gerar relatório. Label: "Registre como os trabalhadores foram comunicados (ex: WhatsApp em 01/06/2025 para todos do setor Produção)."
- Seção "Links de Coleta": por GHE, exibe link base + botão "Copiar mensagem WhatsApp" com template pré-formatado.

### 5.2 Links de Coleta e Tokenização

**Estratégia:** um link por GHE. Ao abrir o link, backend gera um token individual on-demand, preservando anonimato e facilitando distribuição (WhatsApp, e-mail, QR code impresso).

**Link do GHE:** `responder.dominio.com/r/[assessment_dept_id]`

**Fluxo ao acessar:**
1. Backend recebe `assessment_dept_id`.
2. Valida que `assessment.status = 'collecting'` e `end_date >= hoje`.
3. Gera novo `response_token` com `token = UUID v4`.
4. Redireciona para `responder.dominio.com/q/:token`.
5. Token é one-time-use — ao concluir, marcado como `is_used = true`.

**Template WhatsApp:**
```
Prezado(a) colaborador(a),

Você foi convidado(a) a participar de uma pesquisa sobre condições de trabalho.
Suas respostas são ANÔNIMAS — nenhum dado pessoal é coletado.
A participação é VOLUNTÁRIA e leva cerca de 15 minutos.

Acesse pelo link: [LINK]

Prazo: [DATA]
Dúvidas? Fale com [NOME DO PROFISSIONAL].
```

### 5.3 Monitoramento de Progresso

Polling a cada 30 segundos via TanStack Query (`refetchInterval: 30000`). Exibe progresso por GHE em tempo real. Não usar SSE no v1.

### 5.4 Endpoints Backend

```
GET  /companies/:id/assessments          → lista ciclos da empresa
POST /companies/:id/assessments          → cria assessment (status: draft)
GET  /assessments/:id                    → assessment + assessment_departments + dept info
PATCH /assessments/:id                   → atualiza título, datas, participationRegistration
                                           (somente se status = draft ou collecting)
POST /assessments/:id/launch             → valida; gera tokens (1.5× expectedResponses por GHE);
                                           status → 'collecting'; e-mail de resumo ao profissional
POST /assessments/:id/close              → valida status = 'collecting';
                                           status → 'processing'; aciona scoring (async)
GET  /assessments/:id/progress           → { globalAdesao, byDept: [{id, name, expected, responded, pct}] }

GET  /respond/dept/:assessmentDeptId     → gera token; redireciona para /q/:token
                                           (endpoint público; rate-limit 10/min/IP)
```

### 5.5 Regras Específicas

- Lançamento bloqueado se: nenhum GHE selecionado; GHE com `expectedResponses < 1`; `endDate < startDate`.
- Ao lançar: `startDate` auto-preenchida com `today` se vazia.
- Encerramento manual possível antes do `endDate`.
- Job cron (a cada hora) encerra automaticamente assessments com `endDate < now()`.
- Após encerramento, `status = 'processing'` até scoring concluído, então `status = 'completed'`.

### 5.6 Critério de Conclusão

- [ ] Wizard cria assessment e assessment_departments corretamente
- [ ] Lançamento gera tokens no banco (N = 1.5× expectedResponses por GHE)
- [ ] Link de GHE gera token on-demand e redireciona para portal do trabalhador
- [ ] Progresso exibe contagem correta de respondentes por GHE
- [ ] Encerramento manual muda status para `processing`
- [ ] Job cron encerra avaliações expiradas (testar com `endDate` no passado)

---

## MÓDULO 6 — QUESTIONÁRIO (PORTAL DO TRABALHADOR)

**Escopo:** Portal anônimo, completamente separado da aplicação principal. Zero dados pessoais coletados. Otimizado para mobile. Entregável: trabalhador consegue acessar, responder e submeter o questionário via token.

**Dependências:** MÓDULO 5.

### 6.1 App Separado (`apps/worker`)

Build independente. Deploy em `responder.dominio.com`. Sem cookies de sessão. Sem analytics de usuário. Sem fingerprinting de dispositivo. Sem chamadas a APIs externas além do próprio backend.

### 6.2 Páginas Frontend

**`/r/:assessmentDeptId`** — entry point do GHE: sem UI, apenas redireciona após geração do token.

**`/q/:token`** — questionário:

**Tela 1 — Boas-vindas:**
- Título: "Pesquisa sobre Condições de Trabalho"
- Texto: "Você foi convidado(a) a participar de uma pesquisa sobre o ambiente de trabalho. Suas respostas são **completamente anônimas** — nenhum dado pessoal é coletado ou armazenado. A participação é **voluntária**. O questionário tem 40 perguntas e leva cerca de 15 minutos."
- Botão "Começar".
- Se token inválido ou já usado: exibe mensagem de erro apropriada (ver estados abaixo).

**Tela 2 — Questões (one-per-screen):**
- Progress bar no topo (item atual / 40).
- Texto da questão em destaque (Inter 20px).
- 5 botões de resposta empilhados verticalmente, `min-height: 56px`, `width: 100%`:
  - "Nunca / quase nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre / quase sempre"
- Ao selecionar uma opção: salva imediatamente via `POST /respond/answer` (idempotente) e avança para próxima questão automaticamente após 300ms.
- Sem botão "Voltar" (evita manipulação de respostas).
- Progresso salvo incrementalmente — se usuário sair e voltar com mesmo token, retoma da questão seguinte à última respondida.

**Tela 3 — Finalização:**
- "Obrigado pela sua participação. Suas respostas foram registradas."
- Nenhum resultado individual exibido.
- Nenhum link adicional.

**Estados de erro:**
- Token inválido: "Este link é inválido ou não existe."
- Token já usado: "Este link já foi utilizado. Cada link pode ser usado apenas uma vez."
- Avaliação encerrada: "Esta pesquisa está encerrada."

### 6.3 Endpoints Backend (Portal Worker)

```
GET  /respond/dept/:assessmentDeptId          → gera token UUID; redireciona p/ /q/:token
                                                (public; rate-limit 10/min/IP)
GET  /respond/token/:token/status             → { valid, alreadyUsed, assessmentOpen, answeredCount }
GET  /respond/token/:token/items              → lista os 40 itens COPSOQ (texto + metadados)
                                                (sem info de GHE ou empresa)
POST /respond/token/:token/answer             → { itemIndex, likertValue } → upsert; idempotente
POST /respond/token/:token/complete           → valida 40 itens respondidos; marca token used;
                                                incrementa responseCount no assessmentDepartment;
                                                aciona scoring parcial se N respondentes mudou
```

### 6.4 Regras Específicas

- `GET /respond/token/:token/items` nunca retorna informação sobre a empresa ou GHE do respondente.
- `POST /respond/answer` retorna 200 mesmo se item já respondido (idempotente — substitui valor anterior, pois token ainda não marcado como `used`).
- Após `complete`: token `is_used = true`. Qualquer request subsequente com esse token retorna estado `alreadyUsed`.
- `POST /complete` falha com erro se N de itens respondidos < 40.

### 6.5 Critério de Conclusão

- [ ] Fluxo completo end-to-end: link GHE → geração de token → boas-vindas → 40 questões → finalização
- [ ] Salvar incremental funciona (fechar e reabrir retoma da questão correta)
- [ ] Token marcado como `used` após complete; segundo acesso exibe mensagem de erro
- [ ] `responseCount` do GHE incrementa corretamente após cada `complete`
- [ ] Build do `apps/worker` não contém nenhuma referência a auth ou a dados do profissional
- [ ] Mobile UX funcional em viewport 375px

---

## MÓDULO 7 — PONTUAÇÃO (SCORING ENGINE)

**Escopo:** Serviço backend que processa respostas coletadas e calcula escores COPSOQ II-BR por dimensão por GHE. Sem UI própria — resultados são consumidos pelo Módulo 8. Entregável: após encerramento de coleta, `dimension_results` populados com escores e classificações.

**Dependências:** MÓDULO 6.

### 7.1 Algoritmo de Execução

```typescript
// packages/api/src/services/scoring.ts

async function scoreAssessment(assessmentId: string): Promise<void> {
  const assessment = await db.query.assessments.findFirst({ where: eq(id, assessmentId) });
  const depts = await db.query.assessmentDepartments.findMany({
    where: eq(assessmentDepartmentId, assessmentId)
  });

  for (const dept of depts) {
    await scoreDepartment(dept.id);
  }

  await db.update(assessments)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(assessments.id, assessmentId));
}

async function scoreDepartment(assessmentDeptId: string): Promise<void> {
  // 1. Buscar todas as respostas de tokens usados deste GHE
  const usedTokens = await getUsedTokens(assessmentDeptId);
  const nResponses = usedTokens.length;

  // 2. Verificar elegibilidade
  const isEligible = nResponses >= 5;
  await updateEligibility(assessmentDeptId, isEligible, nResponses);
  if (!isEligible) return;

  // 3. Buscar respostas (item_index → array de likert_values)
  const answersMatrix = await buildAnswersMatrix(usedTokens); // Map<itemIndex, number[]>

  // 4. Para cada dimensão D1..D11:
  const dimensions = await db.query.copsoqDimensions.findMany();
  for (const dim of dimensions) {
    const items = await getItemsForDimension(dim.code); // copsoq_items filtrado
    const itemScores: number[][] = items.map(item =>
      answersMatrix.get(item.index)!.map(r => (r - 1) / 4 * 100)
    );
    // itemScores[i][j] = score do item i para respondente j

    const rawScore = mean(itemScores.flat());  // média global de todos itens × respondentes
    const riskScore = dim.direction === 'INVERTED' ? 100 - rawScore : rawScore;
    const riskLevel = riskScore <= 33 ? 'LOW' : riskScore <= 66 ? 'MEDIUM' : 'HIGH';
    const alpha = calculateCronbach(itemScores, nResponses);

    await db.insert(dimensionResults)
      .values({ assessmentDepartmentId: assessmentDeptId, dimensionCode: dim.code,
                rawScore, riskScore, riskLevel, cronbachAlpha: alpha, nResponses })
      .onConflictDoUpdate({ target: [assessmentDepartmentId, dimensionCode],
                            set: { rawScore, riskScore, riskLevel, cronbachAlpha: alpha,
                                   nResponses, calculatedAt: new Date() } });
  }
}

// Cronbach's α
function calculateCronbach(itemScores: number[][], nRespondents: number): number {
  const k = itemScores.length;
  if (k < 2) return NaN;
  const variances = itemScores.map(scores => variance(scores));
  const totalScores = itemScores[0].map((_, j) => sum(itemScores.map(item => item[j])));
  const totalVariance = variance(totalScores);
  if (totalVariance === 0) return NaN;
  return (k / (k - 1)) * (1 - sum(variances) / totalVariance);
}
```

### 7.2 Trigger de Execução

- **Manual:** `POST /assessments/:id/score` (profissional força re-execução).
- **Automático pós-encerramento:** chamado ao executar `POST /assessments/:id/close`.
- **Automático por cron:** job horário que identifica assessments em `processing` e executa scoring.
- **Scoring parcial opcional:** `POST /respond/token/:token/complete` pode acionar scoring do GHE específico quando `responseCount` muda, mantendo dashboard com dados parciais durante coleta ativa.

### 7.3 Endpoints Backend

```
POST /assessments/:id/score          → force re-score (idempotente); retorna job_id ou resultado inline
GET  /assessments/:id/score/status   → { status: 'idle'|'running'|'completed', lastRunAt }
```

### 7.4 Critério de Conclusão

- [ ] Após encerramento, `dimension_results` contém 11 registros por GHE elegível
- [ ] GHE com N < 5 marcado `is_eligible = false`; nenhum `dimension_result` gerado para ele
- [ ] Dimensões com direção INVERTIDA têm `riskScore = 100 − rawScore`
- [ ] Classificação LOW/MEDIUM/HIGH correta nos limites exatos (33, 66)
- [ ] Cronbach's α calculado e persistido (NaN para dimensão de 1 item — D11)
- [ ] Scoring é idempotente: executar duas vezes produz o mesmo resultado
- [ ] `assessment.status = 'completed'` após scoring concluir

---

## MÓDULO 8 — RESULTADOS

**Escopo:** Dashboard analítico de resultados por avaliação. Heat map, radar chart, escores por dimensão, KPIs de coleta, comparativo entre ciclos. Entregável: profissional visualiza e interpreta os resultados do COPSOQ II-BR.

**Dependências:** MÓDULO 7.

### 8.1 Página `/avaliacoes/:id/resultados`

Disponível somente se `assessment.status = 'completed'`.

**Componente 1 — Mapa de Calor (elemento signature da UI):**

Tabela GHE (linhas) × Dimensão (colunas). Células coloridas por nível de risco. Layout denso, referenciável de relance.

- Linhas = GHEs elegíveis. GHEs inelegíveis exibidos como linha cinza com ícone cadeado: "< 5 respostas".
- Colunas = D1–D11, com nomes abreviados (ex: "Demandas", "Influência", "Liderança"...).
- Célula: background interpolado `--risk-low/medium/high` por `riskLevel`. Texto: `riskScore.toFixed(0)`.
- Hover: tooltip `{dimensão} — {GHE}: escore bruto {rawScore}, escore risco {riskScore}, N={nResponses}`.
- Se `cronbachAlpha < 0.5`: célula exibe ícone ⚠ com tooltip "Baixa confiabilidade (α={cronbachAlpha})".

**Componente 2 — Radar Chart por GHE:**

`DimensionRadar` Recharts. 11 eixos, escala 0-100 (`riskScore`). Seletor dropdown de GHE. Múltiplos GHEs sobrepostos (toggle). Legenda com nome do GHE e cor.

**Componente 3 — Barra de Score por Dimensão (empresa como um todo):**

Horizontal bar chart. Cada barra = média ponderada de `riskScore` dos GHEs elegíveis (peso = `nResponses`). Cor da barra = nível de risco. Linhas de referência verticais em 33 e 66. Labels: nome da dimensão (esquerda), valor numérico (direita da barra).

**Componente 4 — KPIs:**

Cards: Taxa de Adesão Global (%), GHEs com Risco Alto (N), GHEs com Risco Médio (N), GHEs Inelegíveis (N), Total Respondentes.

**Componente 5 — Tabela de Dimensões Críticas:**

Lista de dimensões com `riskLevel = HIGH` ordenadas por `riskScore` desc. Para cada: nome da dimensão, GHEs afetados (chips), escore médio da empresa, botão "→ Inventário" (link para módulo 9 com pré-filtro) e "→ Ação" (link para módulo 10 com pré-preenchimento).

**Componente 6 — Comparativo de Ciclos (condicional):**

Exibido somente se ≥ 2 assessments `completed` para a empresa. Line chart com evolução de `riskScore` médio da empresa por dimensão entre ciclos. Seletor de dimensão. Eixo X = ciclos (título + data), Y = riskScore 0-100.

### 8.2 Endpoints Backend

```
GET /assessments/:id/dashboard
→ {
    kpis: { globalAdesao, ghesHighRisk, ghesMediumRisk, ghesIneligible, totalRespondents },
    heatmap: [{ deptId, deptName, nResponses, isEligible,
                dimensions: [{ code, rawScore, riskScore, riskLevel, cronbachAlpha }] }],
    companyAvg: [{ code, weightedAvgRiskScore, riskLevel }],
    criticalDimensions: [{ code, name, avgRiskScore, affectedDepts: [deptName] }]
  }

GET /companies/:companyId/trend
→ [{ assessmentId, title, completedAt,
     dimensions: [{ code, avgRiskScore }] }]    // por ciclo completed
```

### 8.3 Critério de Conclusão

- [ ] Heat map exibe todas as células com cores corretas
- [ ] GHE inelegível exibido como linha bloqueada (sem dados)
- [ ] Células com α < 0,5 exibem ícone de aviso
- [ ] Radar chart renderiza corretamente para 1 GHE e para múltiplos GHEs sobrepostos
- [ ] KPIs refletem os dados reais do scoring
- [ ] Comparativo de ciclos só aparece quando há ≥ 2 ciclos completos

---

## MÓDULO 9 — INVENTÁRIO DE RISCOS

**Escopo:** Geração automática do inventário de riscos a partir dos resultados do COPSOQ II-BR, com edição manual pelo profissional e suporte a lacunas (fatores não cobertos pelo instrumento). Entregável: profissional tem um inventário de riscos editável e conforme NR-1.

**Dependências:** MÓDULO 8 (scoring concluído).

### 9.1 Página `/avaliacoes/:id/inventario`

**Geração automática:** ao acessar a página pela primeira vez após scoring, o sistema gera automaticamente `riskInventoryItems` para cada combinação `GHE elegível × dimensão com riskLevel IN (MEDIUM, HIGH)`.

Template de `hazardDescription` por dimensão (seed, editável):
```
D1: "Sobrecarga de demandas e ritmo de trabalho acelerado"
D2: "Baixa autonomia e limitada oportunidade de desenvolvimento"
D3: "Baixo significado percebido no trabalho e fraco comprometimento"
D4: "Valores organizacionais percebidos como injustos ou conflitantes"
D5: "Qualidade de liderança insatisfatória"
D6: "Relações interpessoais deficientes e baixo apoio entre pares"
D7: "Percepção deteriorada do estado de saúde geral"
D8: "Estresse ocupacional e sinais de esgotamento (burnout)"
D9: "Alto conflito entre demandas do trabalho e vida familiar"
D10: "Baixa satisfação no trabalho"
D11: "Exposição a comportamentos ofensivos no ambiente de trabalho"
```

Template de `possibleHarms` por dimensão (seed, editável):
```
D1: "Estresse crônico, ansiedade, distúrbios do sono, erros operacionais, burnout"
D2: "Desmotivação, baixo engajamento, rotatividade, insatisfação"
D4: "Conflitos interpessoais, desmotivação, desconfiança organizacional"
D5: "Conflitos, absenteísmo, ambiente organizacional negativo, assédio"
D8: "Burnout, transtornos de ansiedade e depressão, afastamentos por saúde mental"
D11: "Danos psicológicos severos, assédio moral/sexual, litígios trabalhistas"
[etc. por dimensão]
```

**Probabilidade e severidade pré-preenchidas:**
- `riskLevel = HIGH`: probabilidade = 3, severidade = 3.
- `riskLevel = MEDIUM`: probabilidade = 2, severidade = 2.
- `riskLevel = LOW`: não gera item automático (apenas alerta se profissional quiser adicionar).

**Layout da página:**

Tabela editável inline. Colunas: GHE, Fator FRPRT MTE, Perigo Identificado (editável), Possíveis Danos (editável), Probabilidade (select 1-3), Severidade (select 1-3), Nível (calculado), Controles Existentes (editável), Medidas Propostas (editável, link para ação). Botão "Adicionar Risco Manual" (para AEP).

**Seção AEP — Fatores não cobertos pelo COPSOQ II-BR:**

Abaixo da tabela principal, seção colapsável "Fatores FRPRT não cobertos pelo COPSOQ II-BR". Lista os fatores F3, F9, F10, F11, F13 com explicação. Tabela de entrada manual com os mesmos campos. Botão "+ Adicionar".

### 9.2 Cálculo de Nível de Risco do Inventário

```
nível_inventário = probabilidade × severidade
1–2 → LOW  | 3–4 → MEDIUM  | 6–9 → HIGH
```

### 9.3 Endpoints Backend

```
GET  /assessments/:id/risk-inventory
→ gera itens automáticos se ainda não existirem (idempotente); retorna todos os itens

PATCH /risk-inventory-items/:itemId
→ atualiza campos editáveis; recalcula risk_level se probability ou severity mudou

POST /assessments/:id/risk-inventory/manual
→ cria item manual (isManual=true); campos obrigatórios: hazardDescription, possibleHarms,
   probability, severity, mteFactorCode

DELETE /risk-inventory-items/:itemId
→ somente itens manuais podem ser excluídos (itens auto só podem ser editados)
```

### 9.4 Critério de Conclusão

- [ ] Geração automática cria itens corretos para MEDIUM e HIGH em GHEs elegíveis
- [ ] Templates de texto pré-preenchidos são editáveis e salvos
- [ ] Probabilidade e severidade iniciais corretas por riskLevel
- [ ] Nível do inventário recalcula ao mudar probabilidade ou severidade
- [ ] Adição manual de risco AEP funcional
- [ ] Itens automáticos não podem ser excluídos (somente editados)

---

## MÓDULO 10 — PLANO DE AÇÃO

**Escopo:** Criação e gerenciamento do plano de ação 5W2H vinculado ao ciclo de avaliação. Entregável: profissional consegue criar, acompanhar e atualizar ações de controle derivadas dos riscos identificados.

**Dependências:** MÓDULO 9.

### 10.1 Página `/avaliacoes/:id/plano-de-acao`

**Header KPIs:** Total de ações (N), Pendentes (N), Em andamento (N), Concluídas (N), % de dimensões HIGH com ≥1 ação concluída.

**Filtros:** por status, por GHE, por dimensão, por responsável.

**Tabela de ações:**
- Colunas: GHE, Dimensão (badge), O Quê, Responsável, Prazo (com badge "Vencido" se `whenDate < today`), Status, Ações (editar, mudar status, excluir).
- Status editável inline via select (não requer abrir modal).
- Ordenação padrão: status asc (pendentes primeiro), prazo asc.

**Criação de ação (modal):**
- Campos: GHE afetado (select, opcional — "Toda a empresa" se null), Dimensão de origem (select D1-D11, opcional), Nível de risco que originou (select LOW/MEDIUM/HIGH, auto-preenchido se vindo de atalho).
- 5W2H: O Quê*, Por Quê*, Responsável*, Onde*, Prazo* (datepicker), Como*, Custo Estimado (moeda, opcional).
- Hierarquia NR-1 (nota informativa): "NR-1 orienta priorizar medidas na organização do trabalho antes de ações individuais. Considere ajustes de processos, carga e comunicação antes de ações de treinamento individual."

**Atalho do Módulo 8:** clicar "→ Ação" em uma dimensão crítica abre o modal pré-preenchido com `dimensionCode` e `riskLevelTrigger`.

**Atalho do Módulo 9:** campo "Medidas Propostas" do inventário tem botão "Criar Ação" que pré-preenche modal com `departmentId` e `dimensionCode`.

### 10.2 Endpoints Backend

```
GET  /assessments/:id/action-plan         → plano + todos os action_items
                                            (cria action_plan se não existir — idempotente)
POST /assessments/:id/action-items        → { actionPlanId, departmentId?, dimensionCode?,
                                              riskLevelTrigger?, what, why, who, where,
                                              whenDate, how, estimatedCost? }
PATCH /action-items/:itemId               → atualiza qualquer campo, incluindo status
DELETE /action-items/:itemId              → exclusão real (não soft)
```

### 10.3 Critério de Conclusão

- [ ] Criação de ação salva todos os 7 campos 5W2H
- [ ] Ações pré-preenchidas via atalho do módulo 8 têm dimensionCode e riskLevel corretos
- [ ] Status mutável inline sem recarregar a página
- [ ] Badge "Vencido" aparece em ações com prazo < data atual
- [ ] Filtros por status e GHE funcionam corretamente
- [ ] Exclusão de ação remove o registro permanentemente

---

## MÓDULO 11 — RELATÓRIO PGR

**Escopo:** Geração de documento PDF e/ou DOCX com a seção psicossocial do PGR, pronta para integração ao PGR completo da empresa. Conteúdo determinístico (sem IA generativa). Entregável: profissional baixa documento técnico revisável e integrável ao PGR.

**Dependências:** MÓDULO 9, MÓDULO 10 (plano de ação e inventário devem existir; relatório é bloqueado sem eles e sem `participationRegistration`).

### 11.1 Página `/avaliacoes/:id/relatorio`

**Pré-visualização do sumário do conteúdo** (outline colapsável com as seções listadas).

**Pré-requisitos visíveis:** checklist inline mostrando o que está completo/pendente antes do botão de geração:
- [✓/✗] Avaliação concluída
- [✓/✗] Evidência de participação dos trabalhadores registrada
- [✓/✗] Pelo menos 1 GHE elegível com resultados
- [✓/✗] Inventário de riscos revisado
- [✓/✗] Plano de ação criado (opcional, mas recomendado)

**Metadados do relatório** (editáveis antes de gerar):
- Nome do responsável técnico (pré-preenchido com `professional.name`).
- Número de credencial (pré-preenchido com `professional.credentialNumber`).
- Data do relatório (padrão: hoje).
- Observações adicionais (textarea).

**Botões:** "Gerar PDF" | "Gerar DOCX". Ambos acionam geração assíncrona.

**Histórico de relatórios:** tabela com data de geração, tipo, tamanho, link de download (URL pré-assinada R2, TTL 1h). Botão "Regerar" para sobrescrever.

**Aviso de adesão baixa:** se taxa global < 60%, exibe alerta amarelo: "A taxa de adesão foi de X%. O relatório incluirá nota de limitação interpretativa."

### 11.2 Estrutura do Documento Gerado

```
[CABEÇALHO]
  Logo do sistema, título "Avaliação de Fatores de Riscos Psicossociais",
  nome da empresa, CNPJ, data do relatório

1. IDENTIFICAÇÃO
   1.1 Dados da empresa (nome, CNPJ, CNAE, porte, endereço)
   1.2 Profissional responsável (nome, tipo, credencial, data)
   1.3 Período de coleta (datas)

2. METODOLOGIA
   2.1 Instrumento: COPSOQ II-BR versão curta (40 itens, 11 dimensões)
   2.2 Referência científica: Gonçalves et al., Rev Saúde Pública 2021;55:69
   2.3 Processo de aplicação: anonimato garantido, participação voluntária,
       conformidade LGPD, escala de resposta Likert 5 pontos
   2.4 Taxa de adesão por GHE (tabela: GHE | Esperados | Respondentes | %)
   2.5 Evidência de participação dos trabalhadores [campo preenchido]
   2.6 Limitações do instrumento (cobertura ~8/13 fatores MTE; GHEs inelegíveis)
   [Se adesão < 60%: seção de limitação interpretativa]

3. IDENTIFICAÇÃO DE PERIGOS E FATORES DE RISCO PSICOSSOCIAL
   Para cada GHE elegível:
   3.x [Nome do GHE] — N trabalhadores, N respondentes (% adesão)
     Tabela: Dimensão | Escore Bruto | Escore de Risco | Nível de Risco | α Cronbach
     Narrative: "Os fatores classificados como ALTO requerem intervenção prioritária."
   3.y [Próximo GHE]...
   3.z Cobertura dos 13 Fatores MTE:
     Tabela: Fator FRPRT | Instrumento que o cobre | Status de avaliação

4. AVALIAÇÃO DOS RISCOS (Probabilidade × Severidade)
   Tabela completa do inventário de riscos (gerada do módulo 9):
   GHE | Perigo Identificado | Possíveis Danos | P | S | Nível | Controles | Medidas

5. PLANO DE AÇÃO (5W2H)
   Tabela completa dos action_items (gerada do módulo 10):
   GHE | Dimensão | O Quê | Por Quê | Quem | Onde | Quando | Como | Custo | Status
   Nota: "Ações organizacionais prioritárias conforme hierarquia NR-1 item 1.4.1."

6. MONITORAMENTO E REVISÃO
   Indicadores recomendados: absenteísmo, rotatividade, registros de denúncias,
   satisfação em pesquisa de clima, afastamentos por saúde mental.
   Próxima avaliação recomendada: [data_conclusão + 2 anos]
   Ciclo PDCA: planejar → executar → verificar → agir.

[APÊNDICE A] — Escores completos por dimensão e GHE (tabela detalhada)
[APÊNDICE B] — Heat map e radar charts (imagens renderizadas)
[ASSINATURA] — Nome, credencial, data, espaço para assinatura digital/física
```

### 11.3 Endpoints Backend

```
POST /assessments/:id/reports/generate
→ { type: 'pdf'|'docx', metadata: { responsibleName, credentialNumber, reportDate, notes } }
→ valida pré-requisitos (RB-04); enfileira job de geração assíncrona; retorna { reportId }

GET  /reports/:reportId/status
→ { status: 'processing'|'ready'|'error', downloadUrl?, fileSizeBytes?, generatedAt? }

GET  /reports/:reportId/download
→ redireciona para URL pré-assinada R2 (TTL 1h); gera nova URL se expirada

GET  /assessments/:id/reports
→ lista histórico de relatórios gerados para o ciclo
```

**Geração técnica:**
- PDF: `@react-pdf/renderer` server-side em Bun. Componentes React definem o layout; dados injetados via props.
- DOCX: biblioteca `docx` (npm). Programmatic document building. Não usa templates de arquivo binário.
- Arquivo salvo em R2 com key `reports/{professionalId}/{companyId}/{assessmentId}/{reportId}.{ext}`.
- NUNCA incluir `response_answers` individuais no documento. Apenas escores agregados.

### 11.4 Critério de Conclusão

- [ ] Pré-requisitos bloqueiam geração com erros claros quando não atendidos
- [ ] PDF gerado contém todas as 6 seções + apêndices corretamente preenchidos
- [ ] DOCX gerado abre sem erros no Word e é editável
- [ ] Download via URL pré-assinada R2 funciona (e expira após 1h)
- [ ] Se taxa de adesão < 60%, relatório contém nota de limitação
- [ ] Dados de resposta individual nunca aparecem no documento

---

## MÓDULO 12 — PAINEL

**Escopo:** Página inicial pós-login. Visão multi-cliente do profissional com status de conformidade de todas as empresas, alertas e atividade recente. Entregável: profissional tem visão instantânea de toda sua carteira de clientes.

**Dependências:** MÓDULO 4, MÓDULO 5, MÓDULO 8 (dados precisam existir para painel ser útil; o módulo pode ser implementado antes com estados vazios adequados).

### 12.1 Página `/painel`

**Seção 1 — Alertas (banner dismissível):**
- Empresas sem nenhum ciclo de avaliação iniciado.
- Ciclos com taxa de adesão < 60% e coleta encerrada (alerta amarelo).
- Ações do plano de ação com prazo vencido (alerta laranja).
- Empresas com último ciclo > 2 anos (revisão recomendada pela NR-1).

**Seção 2 — Grid de Empresas:**
- Cards 3 colunas (desktop), 1 coluna (mobile). Busca por nome.
- Card por empresa:
  - Nome e CNPJ (mascarado).
  - Badge de status NR-1: "Sem Avaliação" (cinza) / "Em Andamento" (azul) / "Concluída" (verde) / "Revisão Recomendada" (amarelo).
  - Último ciclo: título + data de conclusão (ou "N/A").
  - Taxa de adesão do último ciclo (se disponível).
  - Nº de GHEs com risco alto no último ciclo (se disponível).
  - Botão "Acessar" → `/empresas/:id`.

**Seção 3 — Feed de Atividade (últimas 10 ocorrências):**
- Tipos de evento: questionário encerrado automaticamente, relatório gerado, ação vencida.
- Formato: ícone + descrição + empresa + data relativa (ex: "há 2 dias").

### 12.2 Endpoints Backend

```
GET /professionals/me/dashboard
→ {
    alerts: [{ type, message, companyId, companyName, assessmentId? }],
    companies: [{
      id, name, cnpj, lastAssessment: { title, completedAt, globalAdesao, highRiskCount }?,
      nrStatus: 'no_assessment' | 'collecting' | 'completed' | 'review_recommended'
    }],
    recentActivity: [{ type, description, companyName, occurredAt }]
  }
```

### 12.3 Critério de Conclusão

- [ ] Cards de empresa exibem status NR-1 correto baseado no último ciclo
- [ ] Alertas aparecem para os casos definidos (sem avaliação, adesão baixa, ação vencida, revisão)
- [ ] Feed de atividade exibe eventos recentes
- [ ] Empresa sem nenhum dado exibe card com estado vazio acionável
- [ ] Busca por nome funciona no grid

---

## SEÇÃO 7 — SEGURANÇA E LGPD

### 7.1 Arquitetura de Privacidade (Privacy by Design)

**Minimização:** Portal do trabalhador não coleta nome, CPF, e-mail, IP rastreável, device fingerprint, cookies de sessão. Coleta apenas: token UUID (efêmero, sem vínculo a pessoa), valor Likert por item, timestamp de resposta.

**Não-vinculabilidade:** `response_tokens` conecta token a um GHE (`assessmentDepartmentId`), nunca a um trabalhador. Não existe forma técnica de correlacionar uma resposta a um indivíduo identificável.

**Proporcionalidade:** dados de resposta são o mínimo necessário (item_index + valor 1-5). Nenhum texto livre coletado do trabalhador.

**Retenção:** `response_answers` podem ser expurgadas após scoring completo (parâmetro de configuração). `dimension_results` são mantidos permanentemente.

### 7.2 Controles Técnicos

- HTTPS obrigatório em todos os domínios. HSTS com `max-age=31536000`. TLS 1.2+.
- Sessões Better Auth: `httpOnly; secure; sameSite=Strict`. Expiração 7 dias, renovação automática a cada 24h de atividade.
- Rate limiting portal worker: 10 requests/minuto por IP em `/respond/*`.
- CSRF: protegido via Better Auth.
- SQL injection: Drizzle ORM com parameterized queries. Sem queries raw exceto em migrations.
- XSS: DOMPurify em qualquer conteúdo editável pelo usuário renderizado no frontend.
- Secrets: gerenciados via Infisical. Nunca em `.env` commitados em repositório.
- R2 storage: URLs pré-assinadas com TTL máximo de 1 hora. Buckets sem acesso público.

### 7.3 LGPD — Bases Legais

- **Dados do trabalhador:** base legal = cumprimento de obrigação legal (NR-1, art. 7º, II da LGPD). Como dados são anonimizados, não se enquadram como dados pessoais nos termos da LGPD. Documentar esse design no RIPD.
- **Dados do profissional:** base legal = execução de contrato (art. 7º, V).
- **Direitos dos titulares trabalhadores:** tecnicamente inexercíveis por design — os dados são irrastreáveis a indivíduos. Fato documentado nos Termos de Uso do profissional.
- **DPO da empresa cliente:** campo `companies.dpoPoc` armazena referência ao responsável LGPD da empresa cliente para fins de registro.
- **Transferência internacional:** Neon (AWS us-east-1), Cloudflare R2, Resend. Contratos de processamento devem cobrir art. 33 LGPD.

---

*EOF — Especificação COPSOQ II-BR SaaS v2.0*
*Referências regulatórias: NR-1 (Portaria MTE 1.419/2024), Portaria MTE 765/2025, Guia FRPRT MTE 2025*
*Referência científica do instrumento: Gonçalves et al., Rev Saúde Pública 2021;55:69*
*Licença do instrumento: CC BY-NC-ND 4.0*

# NR-1 / COPSOQ II-BR SaaS Platform — Technical Specification SSOT v3.0

**Single Source of Truth (SSOT)** para implementação end-to-end de plataforma SaaS multi-tenant dedicada ao gerenciamento de Riscos Ocupacionais Psicossociais conforme **NR-1** (Portaria MTE 1.419/2024 e 765/2025), utilizando o instrumento canônico **COPSOQ II-BR** (Gonçalves et al., *Rev Saúde Pública* 2021;55:69). Documento estruturado em **Vertical Slices** funcionais e independentes, cada um contendo data layer, regras de negócio, endpoints e componentes de UI associados.

---

## 0. Metadata, Glossário e Convenções de Engenharia

### 0.1 Controle de Versão e Auditoria

| Atributo | Valor |
|---|---|
| `doc_version` | 3.0.0 |
| `doc_status` | APPROVED_FOR_IMPLEMENTATION |
| `effective_date` | 2026-06-17 |
| `supersedes` | spec_nr1_copsoq_saas v2.0 (2026-06-15) |
| `regulatory_anchor` | NR-1 cap. 1.5 (Portaria MTE 1.419/2024); Portaria MTE 765/2025; Guia MTE FRPRT 2025 |
| `instrument_anchor` | COPSOQ II-BR — Gonçalves JS, Moriguchi CS, Chaves TC, Sato TO. *Rev Saúde Pública*. 2021;55:69. DOI: 10.11606/s1518-8787.2021055003123 |
| `instrument_license` | CC BY-NC-ND 4.0 (uso ocupacional permitido; redação dos 40 itens imutável) |
| `lgpd_anchor` | Lei 13.709/2018 (LGPD); art. 7º, II (cumprimento de obrigação legal); art. 12, III (dados anonimizados) |
| `enforcement_start` | 2026-05-26 (vigência obrigatória FRPRT no PGR) |
| `review_cycle` | Bienal (alinhado ao PGR — NR-1 item 1.5.3.3) |

**Change Log:**

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| 3.0.0 | 2026-06-17 | Arquiteto de Soluções IA | Reestruturação em Vertical Slices; introdução de fórmulas LaTeX; taxonomia de erros canônica; matriz RBAC; DDL SQL complementar; JSON Schemas formais |
| 2.0.0 | 2026-06-15 | Eng. Software Principal | Consolidação de módulos numerados; seed COPSOQ; regras RB-01..RB-10 |
| 1.0.0 | 2026-05-20 | Equipe Inicial | Rascunho inicial — escopo MVP |

### 0.2 Glossário Canônico

**Termos Regulatórios (PT-BR):**

| Sigilo | Expansão | Definição Operacional |
|---|---|---|
| NR-1 | Norma Regulamentadora nº 1 | Diretrizes gerais e gerenciamento de riscos ocupacionais; inclui FRPRT desde 2024 |
| FRPRT | Fatores de Risco Psicossocial Relacionados ao Trabalho | 13 fatores catalogados pelo MTE (Guia 2025) |
| GRO | Gerenciamento de Riscos Ocupacionais | Processo contínuo PDCA de identificação, avaliação e controle |
| PGR | Programa de Gerenciamento de Riscos | Documento que materializa o GRO; componentes: Inventário + Plano de Ação |
| GHE | Grupo Homogêneo de Exposição | Unidade mínima de análise; sinônimo operacional de setor/departamento |
| AEP | Avaliação Ergonômica Preliminar | Método complementar para fatores não cobertos pelo COPSOQ |
| COPSOQ II-BR | Copenhagen Psychosocial Questionnaire II — Versão Brasileira | Instrumento canônico; 40 itens, 11 dimensões, escala Likert 5 pontos |
| LGPD | Lei Geral de Proteção de Dados | Lei 13.709/2018 |
| DPO | Encarregado de Proteção de Dados | Responsável LGPD da empresa cliente |

**Termos de Engenharia (EN — uso preservado em código e comunicações técnicas):**

| Termo | Definição Operacional no Sistema |
|---|---|
| `multi-tenant` | Arquitetura de isolamento lógico por `professional_id`; não há isolamento de schema |
| `soft delete` | Marcação `is_active = false` preservando registro; aplica-se a `companies`, `departments` |
| `upsert` | `INSERT ... ON CONFLICT DO UPDATE`; usado em `response_answers` (idempotência) e `dimension_results` (re-scoring) |
| `rate limiting` | Limite 10 req/min/IP em endpoints `/respond/*` do portal do trabalhador |
| `row-level security` (RLS) | Políticas PostgreSQL que filtram tuplas por `professional_id` da sessão |
| `schema` | Estrutura declarativa em `packages/db/schema.ts` (Drizzle ORM) |
| `endpoint` | Par HTTP (método, rota) exposto sob `/api/v1` |
| `payload` | Corpo JSON de requisição/resposta; validado via Zod schemas |
| `token` | UUID v4 one-time-use; vincula resposta a GHE, nunca a trabalhador |
| `idempotency` | Garantia de que re-execução de operação produz mesmo estado final |
| `k-anonymity` | Threshold $k \geq 5$ respondentes por GHE para exposição de resultados agregados |
| `seed data` | Dados estáticos imutáveis (40 itens COPSOQ, 11 dimensões, templates de inventário) |

### 0.3 Convenções de Nomenclatura e Padrões

**Banco de Dados (Drizzle → PostgreSQL):**

- Tabelas: `snake_case` plural (`companies`, `response_tokens`, `dimension_results`).
- Colunas: `snake_case` (`professional_id`, `created_at`, `is_active`).
- Chaves primárias: `id` (UUID v4, `defaultRandom()`).
- Chaves estrangeiras: `<entidade_singular>_id` (`company_id`, `assessment_department_id`).
- Timestamps: `created_at`, `updated_at`, `completed_at` — tipo `timestamp` (sem fuso), interpretados como UTC na aplicação.
- Datas (sem hora): `start_date`, `end_date`, `when_date` — tipo `date` (ISO 8601 `YYYY-MM-DD`).
- Enums: `<entity>_<field>_enum` em PostgreSQL (`assessment_status_enum`, `risk_level_enum`).
- Soft delete: coluna `is_active: boolean default true notNull()`.

**API:**

- Base path: `/api/v1`.
- Rotas: `kebab-case` (`/risk-inventory-items/:itemId`).
- JSON payloads: `camelCase` para campos (`professionalId`, `dimensionCode`); conversão automática na camada de serialização.
- Erros: `{ error: { code: SCREAMING_SNAKE_CASE, message: string, details?: object } }`.
- Paginação: query params `?page=1&limit=20`; resposta `{ data: [], meta: { total, page, limit, pages } }`.

**Frontend:**

- Componentes: `PascalCase` (`RiskBadge`, `DimensionRadar`, `ScoreCell`).
- Arquivos de componente: `PascalCase.tsx` (`RiskBadge.tsx`).
- Hooks customizados: `useCamelCase` (`useAssessmentProgress`, `useWorkerToken`).
- Rotas TanStack Router: file-based, `kebab-case` (`/avaliacoes/$id/resultados`).
- Estado global: TanStack Query v5 (cache + mutations); sem Redux/Zustand no v1.
- Estado local de formulário: React Hook Form + Zod resolvers.

**Tipos TypeScript Compartilhados:**

- Pacote `packages/types` exporta DTOs e enums consumidos por `apps/web`, `apps/worker`, `apps/api`.
- Schemas Zod em `packages/validators` são a fonte única de verdade; tipos derivam via `z.infer<typeof schema>`.

### 0.4 Stack Tecnológico Autoritativo

| Camada | Tecnologia | Versão Pin | Justificativa |
|---|---|---|---|
| Runtime JS | Bun | ≥ 1.1.x | Performance, ESM nativo, TypeScript first-class |
| Backend framework | Elysia | ≥ 1.1.x | Type-safe, Eden treaty, middleware chains |
| ORM | Drizzle ORM | ≥ 0.31.x | SQL-first, schema declarativo, migrations determinísticas |
| Database | Neon (PostgreSQL serverless) | PG 16 | Branching por ambiente, scale-to-zero, RLS nativo |
| Auth | Better Auth | ≥ 1.0.x | Sessions, hooks `user.created`, httpOnly cookies |
| Frontend framework | React | 19.x | Concurrent features, RSC-ready |
| Build tooling | Vite | ≥ 5.x | HMR, code-splitting, build worker app |
| Styling | TailwindCSS | v4 | Design tokens via CSS variables, JIT |
| Component library | shadcn/ui | latest | Acessível, customizável, Radix primitives |
| Data fetching | TanStack Query | v5 | Cache, polling, optimistic mutations |
| Routing | TanStack Router | v1 | Type-safe, file-based, search params tipados |
| Charts | Recharts | ≥ 2.12.x | Heat maps, radar, bar (SVG render) |
| Email | Resend | SDK ≥ 3.x | Transactional, DKIM/SPF gerenciado |
| Object storage | Cloudflare R2 | S3-compatible | Egress gratuito, presigned URLs |
| PDF generation | `@react-pdf/renderer` | ≥ 4.x | Server-side, componentes React → PDF |
| DOCX generation | `docx` (npm) | ≥ 8.x | Programmatic, sem templates binários |
| Monorepo | Turborepo + Bun workspaces | ≥ 2.x | Cache incremental, pipeline paralelo |
| Secrets | Infisical | cloud ou self-hosted | Rotation, audit log, RBAC de variáveis |
| Deploy (API) | Fly.io | — | Edge regions, scale-to-zero, volumes persistentes |
| Deploy (Frontend) | Vercel | — | CDN global, preview deploys por PR |
| CI/CD | GitHub Actions | — | Matrix builds, cache Bun, deploy gates manuais |

**Domínios de Deploy:**

| Domínio | App | Auth | Cookie? |
|---|---|---|---|
| `app.dominio.com` | `apps/web` | Sessão Better Auth obrigatória | `httpOnly; secure; sameSite=Strict` |
| `responder.dominio.com` | `apps/worker` | Nenhuma | Zero cookies, zero fingerprinting |
| `api.dominio.com` | `apps/api` | Sessão compartilhada com `app.dominio.com` | `sameSite=Strict` |

**Separação de Contextos (Privacy Boundary):**

A aplicação principal (`app.dominio.com`) e o portal do trabalhador (`responder.dominio.com`) constituem **contextos de navegador distintos** — sem compartilhamento de `localStorage`, `sessionStorage`, cookies ou `Referer` cruzado. O único ponto de contato é o backend `apps/api`, que isola estritamente metadados do respondente (GHE, timestamp) do payload de respostas (40 valores Likert), conforme **RB-03 — Proteção de anonimato** (Seção 1.8).

---

> **Checkpoint #0 — H2 #0 concluída.** Próxima seção: **H2 #1 — FASE 1: Contexto de Domínio e Requisitos Funcionais** (8 H3, estimativa ~3.000 palavras, inclui fórmulas LaTeX para scoring, matriz de risco, regras de anonimato k≥5).

---

## 1. FASE 1 — Contexto de Domínio e Requisitos Funcionais (Vertical Slice: Domain)

Esta fase estabelece o contrato semântico do sistema: o quadro regulatório brasileiro aplicável, o instrumento científico canônico (COPSOQ II-BR), as fórmulas de pontuação determinísticas, a matriz de funcionalidades que define o escopo fechado do MVP, os atores e o modelo RBAC, e as 10 regras de negócio transversais (RB-01 a RB-10) que governam todos os módulos verticais subsequentes. Toda decisão de implementação nas Fases 2–4 deve ser rastreável a um requisito aqui declarado.

### 1.1 Quadro Regulatório NR-1

A plataforma endereça obrigações decorrentes da atualização da Norma Regulamentadora nº 1 (NR-1) pelo Ministério do Trabalho e Emprego (MTE), que tornou compulsória a inclusão dos Fatores de Risco Psicossocial Relacionados ao Trabalho (FRPRT) no Gerenciamento de Riscos Ocupacionais (GRO) e sua materialização no Programa de Gerenciamento de Riscos (PGR) de toda empresa com vínculos CLT. A fiscalização efetiva inicia-se em 26 de maio de 2026 (Portaria MTE 765/2025), o que define a janela de oportunidade comercial do produto.

| Documento Normativo | Cláusula Aplicável | Obrigação Refletida no Sistema |
|---|---|---|
| NR-1 cap. 1.5 (Portaria MTE 1.419/2024) | 1.5.3.3 — Participação dos trabalhadores | Campo obrigatório `participation_registration` em `assessments`; bloqueia geração de relatório se vazio (RB-04) |
| NR-1 cap. 1.5 (Portaria MTE 1.419/2024) | 1.5.4.4 — Inventário de riscos | Tabela `risk_inventory_items` com campos `hazard_description`, `possible_harms`, `probability`, `severity`, `existing_controls`, `proposed_measures` |
| NR-1 cap. 1.5 (Portaria MTE 1.419/2024) | 1.5.4.5 — Plano de ação | Tabela `action_items` estruturada em 5W2H com campos obrigatórios `what`, `why`, `who`, `where`, `when_date`, `how`, `estimated_cost` |
| Portaria MTE 765/2025 | Art. 1º — Vigência | `enforcement_start = 2026-05-26`; alertas de "revisão recomendada" quando `last_assessment.completed_at + 2 anos < now()` |
| Guia MTE FRPRT 2025 | Catálogo dos 13 fatores | Tabela de mapeamento `copsoq_dimensions.mte_factors_covered` (array) + tabela de lacunas (F3, F9, F10, F11, F13) cobertas via AEP manual |
| Lei 14.457/2022 | Canal de denúncias para empresas com CIPA | Campo informativo no relatório PGR; sem funcionalidade própria no MVP |
| LGPD (Lei 13.709/2018), art. 7º, II | Cumprimento de obrigação legal | Base legal para processamento; dados do trabalhador anonimizados por design (art. 12, III) |
| LGPD, art. 33 | Transferência internacional | Contratos de processamento com Neon (AWS us-east-1), Cloudflare R2, Resend |

**Hierarquia Conceitual GRO → PGR → Componentes:**

```
GRO (processo contínuo PDCA)
└── PGR (documento)
    ├── Revisão: bienal ou mudança significativa (NR-1 item 1.5.3.3)
    ├── Inventário de Riscos (NR-1 item 1.5.4.4)
    │   ├── Perigo identificado
    │   ├── Possíveis danos
    │   ├── GHE exposto
    │   ├── Avaliação: Probabilidade × Severidade → Nível
    │   ├── Controles existentes
    │   └── Medidas preventivas propostas
    └── Plano de Ação (NR-1 item 1.5.4.5) — 5W2H
        ├── What (O Quê)
        ├── Why (Por Quê)
        ├── Who (Quem)
        ├── Where (Onde)
        ├── When (Quando)
        ├── How (Como)
        └── How much (Quanto custa)
```

**Matriz de Risco (NR-1 clássica):** $\text{Nível} = \text{Probabilidade} \times \text{Severidade}$, com $\text{Probabilidade}, \text{Severidade} \in \{1, 2, 3\}$, gerando 9 combinações agregadas em três níveis: $\text{LOW} \in [1,2]$, $\text{MEDIUM} \in [3,4]$, $\text{HIGH} \in [6,9]$.

### 1.2 Os 13 Fatores FRPRT do MTE — Cobertura COPSOQ

O Guia MTE 2025 cataloga 13 fatores FRPRT agrupados em 5 categorias. O COPSOQ II-BR cobre aproximadamente 8 deles diretamente; os 5 restantes (F3, F9, F10, F11, F13) requerem Avaliação Ergonômica Preliminar (AEP) complementar, suportada pelo Módulo 9 — Inventário de Riscos via flag `is_manual = true`.

| # | Fator FRPRT | Categoria | Coberto por Dimensão COPSOQ |
|---|---|---|---|
| F1 | Sobrecarga e ritmo de trabalho | Organização do trabalho | D1 (Demandas), D8 (Burnout) |
| F2 | Baixa autonomia/controle | Organização do trabalho | D2 (Influência e desenvolvimento) |
| F3 | Jornadas prolongadas ou atípicas | Organização do trabalho | **Lacuna** — AEP manual |
| F4 | Trabalho monótono ou baixo conteúdo | Organização do trabalho | D3 (Significado e comprometimento) |
| F5 | Má qualidade da liderança | Relações sociais e liderança | D5 (Liderança) |
| F6 | Falta de apoio social | Relações sociais e liderança | D6 (Relações interpessoais) |
| F7 | Assédio moral/sexual/violência | Relações sociais e liderança | D4 (Valores), D11 (Comportamentos ofensivos) |
| F8 | Desequilíbrio esforço-recompensa | Recompensa e reconhecimento | D8 (Burnout), D10 (Satisfação) — parcial |
| F9 | Insegurança no emprego | Recompensa e reconhecimento | **Lacuna** — AEP manual |
| F10 | Comunicação organizacional deficiente | Comunicação e mudança | **Lacuna** — AEP manual |
| F11 | Gestão de mudanças inadequada | Comunicação e mudança | **Lacuna** — AEP manual |
| F12 | Conflito trabalho-família | Outros | D9 (Conflito trabalho-família) |
| F13 | Exposição a eventos traumáticos | Outros | **Lacuna** — AEP manual |

### 1.3 COPSOQ II-BR — Instrumento Canônico

**Referência canônica:** Gonçalves JS, Moriguchi CS, Chaves TC, Sato TO. *Rev Saúde Pública.* 2021;55:69. DOI: 10.11606/s1518-8787.2021055003123.

**Licença:** Creative Commons CC BY-NC-ND 4.0. Uso ocupacional permitido sem custo. A redação exata dos 40 itens é **imutável** — qualquer alteração invalida o instrumento científica e legalmente. Esta imutabilidade é garantida no sistema pela regra **RB-05** (Seção 1.8) e pela tabela `copsoq_items` tratada como seed data readonly.

**Estrutura do instrumento:** versão curta brasileira — 40 itens distribuídos em 11 dimensões, tempo de aplicação aproximado de 15 a 20 minutos, recomendada para uso ocupacional em empresas de qualquer porte.

**Escala de resposta Likert 5 pontos:**

| Valor | Label (PT-BR) |
|---|---|
| 1 | Nunca / quase nunca |
| 2 | Raramente |
| 3 | Às vezes |
| 4 | Frequentemente |
| 5 | Sempre / quase sempre |

**Mapeamento completo das 11 dimensões:**

| Código | Dimensão | Itens (1–40) | N itens | Direção do Risco | Fatores MTE Cobertos |
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

### 1.4 Motor de Pontuação — Fórmulas LaTeX

A pontuação COPSOQ II-BR é **determinística e idempotente** (RB-06). O scoring engine executa upsert na tabela `dimension_results` (chave única composta por `assessment_department_id` + `dimension_code`), permitindo re-execução segura.

**Passo 1 — Conversão de cada resposta Likert para escore de item no intervalo $[0, 100]$:**

$$
s_{\text{item}}(r) = \frac{r - 1}{4} \times 100, \quad r \in \{1, 2, 3, 4, 5\}
$$

Mapeamento: $r=1 \mapsto 0$, $r=2 \mapsto 25$, $r=3 \mapsto 50$, $r=4 \mapsto 75$, $r=5 \mapsto 100$.

**Passo 2 — Escore bruto da dimensão $D$ sobre um GHE (média de todos os itens × respondentes elegíveis):**

$$
s_{\text{bruto}}(D, g) = \frac{1}{|I_D| \cdot N_g} \sum_{i \in I_D} \sum_{j=1}^{N_g} s_{\text{item}}(r_{i,j})
$$

onde $I_D$ é o conjunto de itens pertencentes à dimensão $D$, $N_g$ é o número de respondentes válidos do GHE $g$, e $r_{i,j}$ é a resposta Likert do respondente $j$ ao item $i$.

**Passo 3 — Aplicação da direção para obter escore de risco:**

$$
s_{\text{risco}}(D, g) = \begin{cases}
s_{\text{bruto}}(D, g), & \text{se } D.\text{direction} = \text{DIRECT} \\
100 - s_{\text{bruto}}(D, g), & \text{se } D.\text{direction} = \text{INVERTED}
\end{cases}
$$

**Passo 4 — Classificação de nível de risco:**

$$
\text{riskLevel}(D, g) = \begin{cases}
\text{LOW}, & s_{\text{risco}}(D, g) \in [0, 33] \\
\text{MEDIUM}, & s_{\text{risco}}(D, g) \in [34, 66] \\
\text{HIGH}, & s_{\text{risco}}(D, g) \in [67, 100]
\end{cases}
$$

**Passo 5 — Coeficiente de confiabilidade Cronbach's α (sobre os $k$ itens da dimensão e $N_g$ respondentes):**

$$
\alpha = \frac{k}{k-1} \left( 1 - \frac{\sum_{i=1}^{k} \text{Var}(s_{\text{item},i})}{\text{Var}\left( \sum_{i=1}^{k} s_{\text{item},i} \right)} \right), \quad k \geq 2
$$

Caso especial: $\alpha = \text{NaN}$ para $k = 1$ (aplica-se a D11, que tem um único item). A dimensão D11 ainda recebe escore e classificação; apenas a confiabilidade é marcada como não-calculável.

**Passo 6 — Média ponderada da empresa para a dimensão $D$ (sobre GHEs elegíveis):**

$$
s_{\text{empresa}}(D) = \frac{\sum_{g \in G_{\text{eleg}}} N_g \cdot s_{\text{risco}}(D, g)}{\sum_{g \in G_{\text{eleg}}} N_g}
$$

onde $G_{\text{eleg}} = \{ g : N_g \geq 5 \}$ é o conjunto de GHEs elegíveis pela regra de anonimato $k \geq 5$ (Seção 1.7).

### 1.5 Matriz de Classificação de Risco (NR-1 × COPSOQ)

A integração entre a avaliação psicossocial (COPSOQ) e o inventário de riscos da NR-1 utiliza duas matrizes complementares: a semáfora de dimensões (originada do scoring) e a matriz Probabilidade × Severidade (originada do inventário). Ambas convergem para o enum `risk_level_enum` (`LOW | MEDIUM | HIGH`).

**Matriz Semáforo COPSOQ (por dimensão × GHE):**

| Intervalo de $s_{\text{risco}}$ | Classificação | Semáforo | Hex Cor |
|---|---|---|---|
| $[0, 33]$ | Favorável | Verde | `#3D8C6B` (`--risk-low`) |
| $[34, 66]$ | Intermediário | Amarelo | `#E8A020` (`--risk-medium`) |
| $[67, 100]$ | Desfavorável | Vermelho | `#D44E3C` (`--risk-high`) |

**Matriz Probabilidade × Severidade (NR-1 inventário):**

| P \ S | S=1 (baixa) | S=2 (média) | S=3 (alta) |
|---|---|---|---|
| P=1 (rara) | 1 = LOW | 2 = LOW | 3 = MEDIUM |
| P=2 (provável) | 2 = LOW | 4 = MEDIUM | 6 = HIGH |
| P=3 (frequente) | 3 = MEDIUM | 6 = HIGH | 9 = HIGH |

Agregação: $\text{LOW} \in \{1, 2\}$, $\text{MEDIUM} \in \{3, 4\}$, $\text{HIGH} \in \{6, 9\}$.

**Pré-preenchimento do inventário a partir do scoring COPSOQ:**

| `risk_level` COPSOQ | `probability` default | `severity` default | Nível Inventário |
|---|---|---|---|
| HIGH | 3 | 3 | HIGH (9) |
| MEDIUM | 2 | 2 | MEDIUM (4) |
| LOW | — | — | Não gera item automático |

### 1.6 Matriz de Funcionalidades — Escopo Fechado

O MVP é estruturado em 4 Vertical Slices autônomos, cada um com critério de conclusão verificável e dependências explícitas. Funcionalidades fora desta matriz estão **fora de escopo** para v1.

| Slice | Módulos | Entregável Principal | Dependências |
|---|---|---|---|
| **VS-A: Tenant Management** | M0 (Project Structure), M1 (Database), M2 (Auth), M3 (Settings), M4 (Empresas) | Profissional cria conta, autentica-se, cadastra empresas e GHEs | — |
| **VS-B: Assessment Engine** | M5 (Avaliações), M6 (Portal do Trabalhador), M7 (Scoring Engine) | Profissional configura ciclo, distribui links, coleta respostas anônimas, scoring executado | VS-A |
| **VS-C: Analytics & NR-1 Documentation** | M8 (Resultados), M9 (Inventário), M10 (Plano de Ação), M11 (Relatório) | Profissional visualiza resultados, gera inventário NR-1, plano 5W2H, relatório PDF/DOCX | VS-B |
| **VS-D: Multi-Client Operations** | M12 (Painel) | Profissional tem visão consolidada de conformidade de todos os clientes | VS-A, VS-B, VS-C |

**Fora de escopo v1 (declarado explicitamente):** billing/cobrança, multi-idioma, white-label, integração com eSocial, integração com SESI/SENAI, API pública para terceiros, marketplace de templates de questionário, módulo de treinamentos, módulo de CIPA, assinatura digital via ICP-Brasil.

### 1.7 Atores, RBAC Foundation e Regras de Anonimato

**Atores do sistema:**

| Ator | Tipo | Auth | Descrição |
|---|---|---|---|
| Profissional | Primário, autenticado | Better Auth session | Psicólogo, técnico/eng. SST, médico do trabalho. Único ator com conta. Gerencia múltiplos clientes. |
| Trabalhador | Secundário, passivo | Token UUID one-time | Responde questionário via link anônimo. Sem conta, sem dados pessoais. |
| Gestor da empresa cliente | Terciário, passivo | Nenhum | Recebe relatório PDF final por e-mail. Sem acesso ao sistema. |

**RBAC Foundation — Roles e Permissões:**

| Role | Escopo | Permissões |
|---|---|---|
| `professional` (default) | Tenant (`professional_id` da sessão) | Full CRUD sobre próprias empresas, departamentos, avaliações, inventário, plano de ação, relatórios |
| `worker` (implícito, sem conta) | Token-bound | `GET /respond/token/:token/items`, `POST /respond/token/:token/answer`, `POST /respond/token/:token/complete` |
| `system_admin` (reservado) | Cross-tenant | Operações de maintenance (cron, expurgo). Não acessa dados de negócio. |

A regra de isolamento `RB-02` é enforcement central: todo acesso a `companies`, `departments`, `assessments`, `response_tokens`, `dimension_results`, `risk_inventory_items`, `action_items`, `reports` valida `professional_id` da sessão. Middleware de autorização (`apps/api/src/middleware/auth.ts`) executa antes de qualquer handler de rota de negócio.

**Regra de anonimato — k-anonymity threshold:**

$$
\text{elegível}(g) \iff N_g \geq 5
$$

Resultados de um GHE não são exibidos se $N_g < 5$. Dados desse GHE não entram em nenhum cálculo agregado (Passo 6 da Seção 1.4). Interface exibe linha cinza com ícone de cadeado e tooltip "< 5 respostas — dados protegidos por anonimato".

**Adesão recomendada e limites:**

| Métrica | Threshold | Comportamento |
|---|---|---|
| Adesão recomendada | $\geq 70\%$ por GHE | Sem ação; badge verde |
| Adesão com aviso | $60\% \leq \text{adesão} < 70\%$ | Badge amarelo; sem bloqueio |
| Adesão baixa | $< 60\%$ global | Relatório inclui seção de limitação interpretativa (RB-09); não bloqueia geração |

### 1.8 Regras de Negócio Transversais (RB-01 a RB-10)

Estas regras são invariantes do domínio — todo módulo vertical deve respeitá-las. Violação de qualquer uma é considerada bug crítico.

| ID | Regra | Enforcement Técnico | Erro/Razão |
|---|---|---|---|
| **RB-01** | Imutabilidade de respostas: após `response_token.is_used = true`, os 40 `response_answers` são imutáveis. Nenhum endpoint permite edição. | Trigger PostgreSQL `BEFORE UPDATE` em `response_answers` rejeita operação se `token.is_used = true` | `403 TOKEN_ALREADY_USED` |
| **RB-02** | Isolamento de tenant: todo acesso a entidades de negócio valida `professional_id` da sessão. | Middleware `requireAuth` + cláusula `WHERE professional_id = $current` em todas as queries | `403 UNAUTHORIZED_TENANT_ACCESS` |
| **RB-03** | Proteção de anonimato: nenhum endpoint retorna `response_answers` individualmente. Dados acessíveis apenas via scoring agregado. | Endpoint `GET /assessments/:id/dashboard` retorna apenas `dimension_results` agregados; tabela `response_answers` não exposta em nenhuma rota | `404 NOT_FOUND` implícito |
| **RB-04** | Pré-requisitos do relatório: bloqueado até (a) `assessment.status = 'completed'`, (b) `assessment.participation_registration` preenchido, (c) $\geq 1$ GHE elegível ($N_g \geq 5$). | Validação em `POST /assessments/:id/reports/generate` antes de enfileirar job | `422 REPORT_PREREQUISITES_UNMET` |
| **RB-05** | Redação COPSOQ inalterável: 40 itens são seed data readonly. Nenhuma rota permite edição. | Tabela `copsoq_items` sem rotas PATCH/POST/DELETE; migration de seed marcada como irreversible | Impossível por design |
| **RB-06** | Scoring idempotente: scoring engine faz upsert em `dimension_results`. Re-execução segura. | `INSERT ... ON CONFLICT (assessment_department_id, dimension_code) DO UPDATE` | Sem erro; estado final consistente |
| **RB-07** | Encerramento automático: job cron horário encerra assessments com `end_date < now()` e `status = 'collecting'`. | Cron `0 * * * *` em `apps/api/src/jobs/close-expired-assessments.ts` | Status → `processing` → scoring |
| **RB-08** | Soft delete com proteção: empresa/departamento com `assessment.status IN ('collecting', 'processing')` não podem ser excluídos. | Validação antes de `UPDATE is_active = false` | `409 DEPARTMENT_HAS_ACTIVE_ASSESSMENT` |
| **RB-09** | Adesão e relatório: se taxa global $< 60\%$, relatório inclui seção de limitações. Não bloqueia geração. | Condicional no renderer PDF/DOCX | Sem erro; flag `low_adhesion_warning = true` |
| **RB-10** | Elegibilidade de GHE: `assessment_department.is_eligible` recalculado pelo scoring. GHE inelegível: nenhum dado entra em cálculo de médias; nenhum resultado exibido. | Scoring engine atualiza `is_eligible` antes de computar `dimension_results` | Sem erro; flag visual `locked` na UI |

**Invariante de Privacidade (decorrente de RB-03):** não existe, em nenhuma camada do sistema (schema, API, logs, analytics), caminho técnico para correlacionar uma `response_answer` a um trabalhador identificável. A tabela `response_tokens` conecta o token a um GHE (`assessment_department_id`), nunca a um indivíduo. Esta propriedade é verificada por teste de auditoria automatizado (Seção 5.3).

---

> **Checkpoint #1 — H2 #1 (FASE 1: Contexto de Domínio e Requisitos Funcionais) concluída.** Próxima seção: **H2 #2 — FASE 2: Arquitetura de Banco de Dados / Data Layer** (9 H3, estimativa ~3.500 palavras, inclui schema Drizzle completo, DDL SQL complementar, estratégia RLS, índices parciais, mapeamento multi-tenant).

---

## 2. FASE 2 — Arquitetura de Banco de Dados / Data Layer (Vertical Slice: Persistence)

Esta fase materializa o contrato semântico da FASE 1 em um schema físico PostgreSQL 16 hospedado no Neon. A modelagem prioriza três invariantes arquitetônicas: (i) isolamento multi-tenant via Row-Level Security em conjunto com middleware aplicacional; (ii) separação física entre metadados do respondente (`response_tokens`) e payload de respostas (`response_answers`), garantindo a invariante de privacidade declarada em RB-03; (iii) imutabilidade dos seeds científicos (`copsoq_items`, `copsoq_dimensions`) protegida por ausência de rotas de escrita e por constraints de integridade.

### 2.1 Estratégia Multi-Tenant (Row-Level Security)

O sistema adota isolamento **lógico por `professional_id`** (não isolamento de schema). Esta decisão otimiza custo operacional em Neon serverless e simplifica migrações, ao custo de exigir disciplina de enforcement em duas camadas defensivas:

| Camada | Mecanismo | Cobertura |
|---|---|---|
| Aplicacional (primary) | Middleware `requireAuth` + cláusula `WHERE professional_id = $current` em todas as queries via Drizzle | 100% das rotas de negócio |
| Banco de dados (defense-in-depth) | PostgreSQL RLS policies em tabelas sensíveis | Tabelas com `professional_id` direto: `companies`, `assessments` |
| Banco de dados (cascata) | RLS policies com subquery em tabelas filhas | `departments` (via `company_id`), `response_tokens` (via `assessment_department_id → assessment_id`) |

**Variável de sessão PostgreSQL:**

```sql
-- Setada pelo middleware Better Auth ao estabelecer conexão:
SET LOCAL app.current_professional_id = '<uuid>';
```

**Política RLS canônica (exemplo para `companies`):**

```sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;

CREATE POLICY companies_tenant_isolation ON companies
  USING (professional_id = current_setting('app.current_professional_id')::uuid);
```

**Tabelas sem RLS (justificativa):**

| Tabela | Razão |
|---|---|
| `professionals` | Acesso apenas via lookup direto por `userId` (Better Auth); RLS desnecessária |
| `copsoq_items`, `copsoq_dimensions` | Seed data global, readonly, sem `professional_id` |
| `response_answers` | Anonimizada por design; acesso apenas via scoring engine (transação service-level); RB-03 proíbe exposição direta |

### 2.2 Schema — Tabelas de Identidade

```typescript
// packages/db/schema/identity.ts
import { pgTable, uuid, text, timestamp, boolean, integer, char, pgEnum } from 'drizzle-orm/pg-core';

export const professionTypeEnum = pgEnum('profession_type', [
  'psychologist', 'sst_engineer', 'sst_technician', 'occupational_physician', 'other'
]);

export const professionals = pgTable('professionals', {
  id:                uuid('id').primaryKey().defaultRandom(),
  userId:            uuid('user_id').notNull().references(() => users.id),
  name:              text('name').notNull(),
  professionType:    professionTypeEnum('profession_type').notNull(),
  credentialNumber:  text('credential_number'),  // CRP, CREA, CRM conforme professionType
  phone:             text('phone'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
});

export const companies = pgTable('companies', {
  id:              uuid('id').primaryKey().defaultRandom(),
  professionalId:  uuid('professional_id').notNull().references(() => professionals.id),
  name:            text('name').notNull(),
  cnpj:            text('cnpj').notNull().unique(),  // 14 dígitos numéricos, validado
  cnaePrimary:     text('cnae_primary'),             // formato NNNN-X
  employeeCount:   integer('employee_count'),
  city:            text('city'),
  state:           char('state', { length: 2 }),     // UF
  contactName:     text('contact_name'),
  contactEmail:    text('contact_email'),
  contactPhone:    text('contact_phone'),
  dpoPoc:          text('dpo_poc'),                  // responsável LGPD da empresa cliente
  isActive:        boolean('is_active').default(true).notNull(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
});

export const departments = pgTable('departments', {
  id:           uuid('id').primaryKey().defaultRandom(),
  companyId:    uuid('company_id').notNull().references(() => companies.id),
  name:         text('name').notNull(),
  description:  text('description'),
  workerCount:  integer('worker_count').notNull(),
  isActive:     boolean('is_active').default(true).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniqueCompanyDeptName: unique().on(t.companyId, t.name),
}));
```

**Constraints CHECK adicionais (DDL complementar):**

```sql
ALTER TABLE companies ADD CONSTRAINT chk_cnpj_format
  CHECK (cnpj ~ '^\d{14}$');
ALTER TABLE companies ADD CONSTRAINT chk_state_uf
  CHECK (state ~ '^[A-Z]{2}$');
ALTER TABLE departments ADD CONSTRAINT chk_worker_count_positive
  CHECK (worker_count > 0);
```

### 2.3 Schema — Instrumento COPSOQ (Imutável)

```typescript
// packages/db/schema/copsoq.ts
import { pgTable, smallint, text, pgEnum } from 'drizzle-orm/pg-core';

export const dimensionCodeEnum = pgEnum('dimension_code', [
  'D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11'
]);

export const directionEnum = pgEnum('direction', ['DIRECT', 'INVERTED']);

export const copsoqItems = pgTable('copsoq_items', {
  index:             smallint('index').primaryKey(),  // 1-40
  dimensionCode:     dimensionCodeEnum('dimension_code').notNull(),
  textPtBr:          text('text_pt_br').notNull(),    // redação exata Gonçalves et al. 2021
  responseType:      text('response_type').notNull(), // 'frequency'|'degree'|'agreement'
  orderInDimension:  smallint('order_in_dimension').notNull(),
});

export const copsoqDimensions = pgTable('copsoq_dimensions', {
  code:              dimensionCodeEnum('code').primaryKey(),
  namePtBr:          text('name_pt_br').notNull(),
  groupName:         text('group_name').notNull(),
  itemCount:         smallint('item_count').notNull(),
  direction:         directionEnum('direction').notNull(),
  descriptionPtBr:   text('description_pt_br').notNull(),
  mteFactorsCovered: text('mte_factors_covered').array(),  // ex: ['F1','F2']
});
```

**Proteção de imutabilidade (RB-05):**

```sql
-- Trigger que bloqueia qualquer UPDATE/DELETE nas tabelas COPSOQ em produção
CREATE OR REPLACE FUNCTION block_copsoq_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'COPSOQ seed tables are immutable (RB-05)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copsoq_items_no_update BEFORE UPDATE OR DELETE ON copsoq_items
  FOR EACH ROW EXECUTE FUNCTION block_copsoq_mutation();
CREATE TRIGGER copsoq_dimensions_no_update BEFORE UPDATE OR DELETE ON copsoq_dimensions
  FOR EACH ROW EXECUTE FUNCTION block_copsoq_mutation();
```

Exceção controlada: migration `0001_seed_copsoq.ts` (irreversible) é a única via autorizada a popular estas tabelas, executada em ambiente controlado com `DISABLE TRIGGER` transitório.

### 2.4 Schema — Avaliação e Tokenização Anônima

```typescript
// packages/db/schema/assessment.ts
import { pgTable, uuid, text, timestamp, date, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { companies, professionals, departments } from './identity';
import { dimensionCodeEnum } from './copsoq';

export const assessmentStatusEnum = pgEnum('assessment_status', [
  'draft', 'collecting', 'processing', 'completed', 'archived'
]);

export const assessments = pgTable('assessments', {
  id:                        uuid('id').primaryKey().defaultRandom(),
  companyId:                 uuid('company_id').notNull().references(() => companies.id),
  professionalId:            uuid('professional_id').notNull().references(() => professionals.id),
  instrument:                text('instrument').default('COPSOQ2_BR_SHORT').notNull(),
  title:                     text('title').notNull(),
  status:                    assessmentStatusEnum('status').default('draft').notNull(),
  startDate:                 date('start_date'),
  endDate:                   date('end_date'),
  participationRegistration: text('participation_registration'),  // evidência obrigatória (RB-04)
  workerCommunicationSentAt: timestamp('worker_communication_sent_at'),
  createdAt:                 timestamp('created_at').defaultNow().notNull(),
  updatedAt:                 timestamp('updated_at').defaultNow().notNull(),
  completedAt:               timestamp('completed_at'),
});

export const assessmentDepartments = pgTable('assessment_departments', {
  id:                uuid('id').primaryKey().defaultRandom(),
  assessmentId:      uuid('assessment_id').notNull().references(() => assessments.id),
  departmentId:      uuid('department_id').notNull().references(() => departments.id),
  expectedResponses: integer('expected_responses').notNull(),
  tokenCount:        integer('token_count').default(0).notNull(),
  responseCount:     integer('response_count').default(0).notNull(),
  isEligible:        boolean('is_eligible').default(false).notNull(),  // responseCount >= 5 (RB-10)
  createdAt:         timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqueAssessmentDept: unique().on(t.assessmentId, t.departmentId),
}));

export const responseTokens = pgTable('response_tokens', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  assessmentDepartmentId: uuid('assessment_department_id').notNull()
                          .references(() => assessmentDepartments.id),
  token:                  text('token').notNull().unique(),  // UUID v4 string
  isUsed:                 boolean('is_used').default(false).notNull(),
  usedAt:                 timestamp('used_at'),
  createdAt:              timestamp('created_at').defaultNow().notNull(),
  // NENHUM dado de trabalhador. Token não é rastreável a indivíduo (RB-03).
});
```

**Constraints CHECK:**

```sql
ALTER TABLE assessments ADD CONSTRAINT chk_assessment_dates
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
ALTER TABLE assessment_departments ADD CONSTRAINT chk_expected_responses_positive
  CHECK (expected_responses > 0);
ALTER TABLE assessment_departments ADD CONSTRAINT chk_response_count_nonneg
  CHECK (response_count >= 0 AND response_count <= token_count);
```

**Hierarquia de dados (diagrama ASCII):**

```
professional (1)
└── company (N)              [professional_id FK]
    ├── department (N)       [company_id FK]
    └── assessment (N)       [company_id FK, professional_id FK]
        └── assessment_department (N)   [assessment_id, department_id — unique pair]
            ├── response_token (1.5×expected) [assessment_department_id FK]
            │   └── response_answer (40)     [token_id FK, item_index 1-40]
            └── dimension_result (11)        [assessment_department_id, dimension_code — unique]
        ├── risk_inventory_item (N)          [assessment_id, assessment_department_id?]
        └── action_plan (1)                  [assessment_id unique]
            └── action_item (N)              [action_plan_id, department_id?]
        └── report (N)                       [assessment_id]
```

### 2.5 Schema — Respostas e Resultados

```typescript
// packages/db/schema/responses.ts
import { pgTable, uuid, smallint, timestamp, numeric, integer, boolean, unique } from 'drizzle-orm/pg-core';
import { responseTokens, assessmentDepartments } from './assessment';
import { dimensionCodeEnum } from './copsoq';

export const responseAnswers = pgTable('response_answers', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tokenId:      uuid('token_id').notNull().references(() => responseTokens.id),
  itemIndex:    smallint('item_index').notNull(),   // 1-40
  likertValue:  smallint('likert_value').notNull(), // 1-5
  answeredAt:   timestamp('answered_at').defaultNow().notNull(),
}, (t) => ({
  uniqueTokenItem: unique().on(t.tokenId, t.itemIndex),
  chkItemRange: check('item_index BETWEEN 1 AND 40', t.itemIndex),
  chkLikertRange: check('likert_value BETWEEN 1 AND 5', t.likertValue),
}));

export const riskLevelEnum = pgEnum('risk_level', ['LOW', 'MEDIUM', 'HIGH']);

export const dimensionResults = pgTable('dimension_results', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  assessmentDepartmentId: uuid('assessment_department_id').notNull()
                          .references(() => assessmentDepartments.id),
  dimensionCode:          dimensionCodeEnum('dimension_code').notNull(),
  rawScore:               numeric('raw_score', { precision: 5, scale: 2 }).notNull(),
  riskScore:              numeric('risk_score', { precision: 5, scale: 2 }).notNull(),
  riskLevel:              riskLevelEnum('risk_level').notNull(),
  cronbachAlpha:          numeric('cronbach_alpha', { precision: 4, scale: 3 }),  // pode ser NULL (D11)
  nResponses:             integer('n_responses').notNull(),
  calculatedAt:           timestamp('calculated_at').defaultNow().notNull(),
}, (t) => ({
  uniqueAssessmentDimension: unique().on(t.assessmentDepartmentId, t.dimensionCode),
  chkScoreRange: check('raw_score BETWEEN 0 AND 100', t.rawScore),
  chkRiskScoreRange: check('risk_score BETWEEN 0 AND 100', t.riskScore),
  chkNResponsesMin: check('n_responses >= 5', t.nResponses),  // só existe registro se elegível
}));
```

**Trigger RB-01 — Imutabilidade pós `is_used = true`:**

```sql
CREATE OR REPLACE FUNCTION block_answer_mutation_if_used() RETURNS trigger AS $$
DECLARE
  tok_is_used boolean;
BEGIN
  SELECT is_used INTO tok_is_used FROM response_tokens WHERE id = NEW.token_id OR id = OLD.token_id;
  IF tok_is_used THEN
    RAISE EXCEPTION 'Token already used — answers are immutable (RB-01)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER response_answers_no_mutation_if_used
  BEFORE UPDATE OR DELETE ON response_answers
  FOR EACH ROW EXECUTE FUNCTION block_answer_mutation_if_used();
```

### 2.6 Schema — Inventário de Riscos e Plano de Ação 5W2H (NR-1)

```typescript
// packages/db/schema/nr1.ts
import { pgTable, uuid, text, smallint, timestamp, date, numeric, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { assessments, assessmentDepartments } from './assessment';
import { departments } from './identity';
import { dimensionCodeEnum, riskLevelEnum } from './copsoq';

export const riskInventoryItems = pgTable('risk_inventory_items', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  assessmentId:           uuid('assessment_id').notNull().references(() => assessments.id),
  assessmentDepartmentId: uuid('assessment_department_id')
                          .references(() => assessmentDepartments.id),  // null = empresa toda
  dimensionCode:          dimensionCodeEnum('dimension_code'),            // null = risco manual AEP
  mteFactorCode:          text('mte_factor_code'),                        // 'F1'..'F13'
  isManual:               boolean('is_manual').default(false).notNull(),  // true = AEP manual
  hazardDescription:      text('hazard_description').notNull(),
  possibleHarms:          text('possible_harms').notNull(),
  probability:            smallint('probability').notNull(),  // 1-3
  severity:               smallint('severity').notNull(),     // 1-3
  existingControls:       text('existing_controls'),
  proposedMeasures:       text('proposed_measures'),
  createdAt:              timestamp('created_at').defaultNow().notNull(),
  updatedAt:              timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  chkProbability: check('probability BETWEEN 1 AND 3', t.probability),
  chkSeverity:    check('severity BETWEEN 1 AND 3', t.severity),
}));

export const actionPlans = pgTable('action_plans', {
  id:           uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id').notNull().unique().references(() => assessments.id),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
});

export const actionStatusEnum = pgEnum('action_status', [
  'pending', 'in_progress', 'completed', 'cancelled'
]);

export const actionItems = pgTable('action_items', {
  id:               uuid('id').primaryKey().defaultRandom(),
  actionPlanId:     uuid('action_plan_id').notNull().references(() => actionPlans.id),
  departmentId:     uuid('department_id').references(() => departments.id),  // null = empresa toda
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
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
});
```

**Nível de risco do inventário (gerado virtualmente, não persistido):** calculado em runtime pela fórmula $\text{nível} = P \times S$ com agregação LOW/MEDIUM/HIGH conforme Seção 1.5. Não há coluna persistida para evitar inconsistência com $P$ e $S$ mutáveis.

### 2.7 Schema — Relatórios e Storage

```typescript
// packages/db/schema/reports.ts
import { pgTable, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { assessments } from './assessment';

export const reportTypeEnum = pgEnum('report_type', ['pdf', 'docx']);

export const reports = pgTable('reports', {
  id:             uuid('id').primaryKey().defaultRandom(),
  assessmentId:   uuid('assessment_id').notNull().references(() => assessments.id),
  type:           reportTypeEnum('type').notNull(),
  storageKey:     text('storage_key').notNull(),
  // Padrão: reports/{professionalId}/{companyId}/{assessmentId}/{reportId}.{ext}
  fileSizeBytes:  integer('file_size_bytes'),
  generatedAt:    timestamp('generated_at').defaultNow().notNull(),
  downloadUrl:    text('download_url'),     // URL pré-assinada R2 (TTL 1h)
  urlExpiresAt:   timestamp('url_expires_at'),
  status:         text('status').default('processing').notNull(),
  // 'processing' | 'ready' | 'error'
  errorMessage:   text('error_message'),
});
```

**Política de retenção (R2 lifecycle):** objetos sob prefixo `reports/` com `generated_at > 365 dias` são migrados para tier `GLACIER_IR` (R2 infrequent access). URLs pré-assinadas nunca excedem TTL de 1h.

### 2.8 Estratégia de Indexação

Índices projetados para os hot paths identificados: (a) portal do trabalhador (`GET /respond/token/:token/status` — alta frequência, baixa latência); (b) dashboard analítico (agregações por `assessment_department_id`); (c) listagens paginadas do profissional (`professional_id` + `created_at DESC`).

```sql
-- Hot path: portal do trabalhador
CREATE INDEX idx_response_tokens_token ON response_tokens(token);                         -- lookup por token
CREATE INDEX idx_response_tokens_dept_unused ON response_tokens(assessment_department_id)
  WHERE is_used = false;                                                                  -- partial index
CREATE INDEX idx_response_answers_token ON response_answers(token_id, item_index);

-- Hot path: dashboard analítico
CREATE INDEX idx_dimension_results_dept ON dimension_results(assessment_department_id);
CREATE INDEX idx_dimension_results_dept_dim ON dimension_results(assessment_department_id, dimension_code);

-- Listagens paginadas do profissional
CREATE INDEX idx_companies_professional_created ON companies(professional_id, created_at DESC)
  WHERE is_active = true;
CREATE INDEX idx_assessments_company_status ON assessments(company_id, status);
CREATE INDEX idx_assessments_professional_status ON assessments(professional_id, status, updated_at DESC);

-- Cascata JOINs
CREATE INDEX idx_departments_company_active ON departments(company_id) WHERE is_active = true;
CREATE INDEX idx_assessment_depts_assessment ON assessment_departments(assessment_id);
CREATE INDEX idx_risk_inventory_assessment ON risk_inventory_items(assessment_id);
CREATE INDEX idx_action_items_plan_status ON action_items(action_plan_id, status, when_date);
CREATE INDEX idx_reports_assessment ON reports(assessment_id, generated_at DESC);
```

**Análise de seletividade (estimativa em deployment de 10k profissionais × 5 empresas × 2 ciclos):**

| Índice | Cardinalidade Estimada | Seletividade |
|---|---|---|
| `idx_response_tokens_token` | ~500k tokens | ~100% (unique) |
| `idx_dimension_results_dept_dim` | ~22k linhas (200 dept × 11 dims) | 0.0045% por lookup |
| `idx_companies_professional_created` | ~50k empresas | 0.002% por profissional |

### 2.9 Políticas RLS, Constraints e Soft Delete

**Matriz RLS completa:**

| Tabela | RLS | Estratégia |
|---|---|---|
| `companies` | ✅ | `professional_id = current_setting('app.current_professional_id')` |
| `departments` | ✅ | `company_id IN (SELECT id FROM companies WHERE professional_id = current_setting(...))` |
| `assessments` | ✅ | `professional_id = current_setting(...)` |
| `assessment_departments` | ✅ | `assessment_id IN (SELECT id FROM assessments WHERE professional_id = current_setting(...))` |
| `response_tokens` | ✅ | via `assessment_department_id` cascade |
| `response_answers` | ❌ | Acesso apenas por service role (scoring engine); não exposta em endpoints |
| `dimension_results` | ✅ | via `assessment_department_id` cascade |
| `risk_inventory_items` | ✅ | via `assessment_id` cascade |
| `action_plans`, `action_items` | ✅ | via `assessment_id` cascade |
| `reports` | ✅ | via `assessment_id` cascade |
| `professionals` | ❌ | Lookup direto por `userId` |
| `copsoq_*` | ❌ | Global readonly |

**Soft delete policy:**

- `companies.is_active` e `departments.is_active` controlam visibilidade em listagens.
- Soft delete bloqueado por RB-08: validação aplicacional verifica ausência de assessments em status `collecting` ou `processing` antes de setar `is_active = false`.
- Hard delete não é exposto em endpoints; reservado para scripts administrativos com retention policy de 90 dias pós soft delete.

**Retenção e expurgo:**

| Tabela | Política |
|---|---|
| `response_answers` | Expurgáveis 30 dias após `assessment.status = 'completed'` (configurável via `RETENTION_RESPONSE_ANSWERS_DAYS`) |
| `response_tokens` | Retidos indefinidamente (auditoria de contagem) |
| `dimension_results` | Retidos permanentemente (base para relatórios históricos) |
| `reports` (metadados) | Retidos permanentemente; arquivos R2 seguem lifecycle próprio |

---

> **Checkpoint #2 — H2 #2 (FASE 2: Data Layer) concluída.** Próxima seção: **H2 #3 — FASE 3: Engenharia de Backend e API / Application Layer** (13 H3, estimativa ~4.500 palavras, inclui convenções de API, JSON Schemas por endpoint, matriz RBAC, validações Zod, rate limiting, idempotency keys, background jobs).

---

## 3. FASE 3 — Engenharia de Backend e API / Application Layer (Vertical Slice: Service)

Esta fase especifica o contrato de comunicação entre frontend (`apps/web`, `apps/worker`) e backend (`apps/api`), construído sobre Elysia + Bun runtime. O backend é a única camada autorizada a acessar o banco de dados, executar scoring e gerar relatórios. Endpoints são organizados por Vertical Slice e seguem rigorosamente as regras RB-01 a RB-10 declaradas na FASE 1. Toda validação de payload é feita via schemas Zod compartilhados em `packages/validators`, garantindo que tipos TypeScript derivem de uma fonte única de verdade.

### 3.1 Convenções Globais de API

| Convenção | Valor |
|---|---|
| Base path | `/api/v1` |
| Content-Type | `application/json; charset=utf-8` |
| Auth (rotas autenticadas) | Cookie `better-auth.session_token` (`httpOnly; secure; sameSite=Strict`) |
| Auth (portal worker) | Nenhuma; token UUID v4 na path parameter |
| Paginação | Query params `?page=1&limit=20` (limit ≤ 100) |
| Resposta paginada | `{ data: T[], meta: { total: number, page: number, limit: number, pages: number } }` |
| Erro | `{ error: { code: string, message: string, details?: object } }` |
| Idempotência | Header `Idempotency-Key: <uuid>` em POSTs mutacionais; cache de 24h |
| Versionamento | Path versioning (`/v1`); breaking changes em `/v2` |

**Taxonomia de Códigos de Erro (canônicos):**

| Code | HTTP Status | Trigger |
|---|---|---|
| `UNAUTHORIZED` | 401 | Sessão ausente ou inválida |
| `UNAUTHORIZED_TENANT_ACCESS` | 403 | `professional_id` da sessão não corresponde ao recurso |
| `CNPJ_INVALID` | 422 | Dígitos verificadores do CNPJ inválidos |
| `COMPANY_NOT_FOUND` | 404 | `company_id` inexistente ou inativo |
| `DEPARTMENT_HAS_ACTIVE_ASSESSMENT` | 409 | Soft delete bloqueado por assessment em `collecting`/`processing` |
| `ASSESSMENT_NOT_DRAFT` | 409 | Operação permitida apenas em status `draft` |
| `ASSESSMENT_NOT_COLLECTING` | 409 | Operação permitida apenas em status `collecting` |
| `ASSESSMENT_NOT_COMPLETED` | 409 | Operação permitida apenas em status `completed` |
| `TOKEN_INVALID` | 404 | Token UUID não existe |
| `TOKEN_ALREADY_USED` | 403 | Token já consumido (RB-01) |
| `TOKEN_ASSESSMENT_CLOSED` | 409 | Token válido mas assessment encerrado |
| `GHE_BELOW_MINIMUM_RESPONSES` | 422 | GHE com $N_g < 5$ (RB-10) |
| `REPORT_PREREQUISITES_UNMET` | 422 | RB-04: status/participation/eligibilidade insuficientes |
| `PARTICIPATION_NOT_REGISTERED` | 422 | `participation_registration` vazio |
| `PROFESSIONAL_NOT_FOUND` | 404 | Sessão sem `professional` vinculado |
| `VALIDATION_ERROR` | 422 | Payload falhou validação Zod |
| `RATE_LIMIT_EXCEEDED` | 429 | Limite 10 req/min/IP excedido em `/respond/*` |
| `INTERNAL_ERROR` | 500 | Erro não-categorizado |

### 3.2 Autenticação e Sessão (Better Auth)

```typescript
// apps/api/src/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,        // 7 dias
    updateAge: 60 * 60 * 24,             // renova a cada 24h de atividade
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  cookies: {
    secure: true,
    sameSite: 'strict',
    httpOnly: true,
  },
  rateLimit: {
    window: 60,
    max: 10,                              // 10 logins/min/IP
  },
});

// Hook: cria professional quando user é criado
auth.on('user.created', async (user) => {
  await db.insert(professionals).values({
    userId: user.id,
    name: user.name ?? 'Profissional sem nome',
    professionType: 'other',
  });
});
```

**Variáveis de ambiente requeridas:**

```
DATABASE_URL                    # Neon connection string
BETTER_AUTH_SECRET              # 32+ chars random
RESEND_API_KEY
R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
APP_URL                         # https://app.dominio.com
WORKER_APP_URL                  # https://responder.dominio.com
RETENTION_RESPONSE_ANSWERS_DAYS # default 30
```

### 3.3 RBAC Enforcement e Middleware de Tenant Isolation

```typescript
// apps/api/src/middleware/auth.ts
import { Elysia } from 'elysia';

export const requireAuth = new Elysia()
  .onBeforeHandle(async ({ cookie, set, store }) => {
    const session = await auth.api.getSession({ headers: { cookie: cookie.toString() } });
    if (!session) {
      set.status = 401;
      return { error: { code: 'UNAUTHORIZED', message: 'Session required' } };
    }
    const professional = await db.query.professionals.findFirst({
      where: eq(professionals.userId, session.user.id),
    });
    if (!professional) {
      set.status = 404;
      return { error: { code: 'PROFESSIONAL_NOT_FOUND', message: 'No professional linked' } };
    }
    // Seta variável de sessão PostgreSQL para RLS (defense-in-depth)
    await db.execute(sql`SET LOCAL app.current_professional_id = ${professional.id}`);
    store.professional = professional;
  });

// Helper para validação de posse em handlers
export async function assertTenantOwnership(
  resourceProfessionalId: string,
  currentProfessionalId: string
): Promise<void> {
  if (resourceProfessionalId !== currentProfessionalId) {
    throw new HttpError(403, 'UNAUTHORIZED_TENANT_ACCESS', 'Cross-tenant access denied');
  }
}
```

**Matriz RBAC (Recurso × Operação × Tenant Scope):**

| Recurso | GET | POST | PATCH | DELETE | Escopo |
|---|---|---|---|---|---|
| `professionals/me` | ✅ | — | ✅ (próprio) | — | Self |
| `companies` | ✅ (próprios) | ✅ | ✅ (próprio) | soft delete (RB-08) | Tenant |
| `departments` | ✅ (da empresa) | ✅ | ✅ | soft delete (RB-08) | Tenant (cascade) |
| `assessments` | ✅ (da empresa) | ✅ | ✅ (draft/collecting) | — | Tenant |
| `assessments/:id/launch` | — | ✅ (draft) | — | — | Tenant |
| `assessments/:id/close` | — | ✅ (collecting) | — | — | Tenant |
| `assessments/:id/score` | — | ✅ (force re-score) | — | — | Tenant |
| `assessments/:id/dashboard` | ✅ (completed) | — | — | — | Tenant |
| `assessments/:id/risk-inventory` | ✅ | ✅ (manual) | ✅ (item) | ✅ (manual only) | Tenant |
| `assessments/:id/action-plan` | ✅ | ✅ | ✅ | hard delete | Tenant |
| `assessments/:id/reports/generate` | — | ✅ (RB-04) | — | — | Tenant |
| `respond/dept/:assessmentDeptId` | ✅ (public, rate-limited) | — | — | — | Public |
| `respond/token/:token/*` | ✅ (public) | ✅ (public) | — | — | Public |

### 3.4 Endpoints — Auth & Profile (Slice VS-A)

```
POST   /api/v1/auth/register
  Request:  { name: string, email: string, password: string,
              professionType: 'psychologist'|'sst_engineer'|'sst_technician'|'occupational_physician'|'other',
              credentialNumber?: string, acceptedTerms: true }
  Response: 201 { userId: string, message: 'Email verification sent' }
  Errors:   422 VALIDATION_ERROR | 409 EMAIL_ALREADY_REGISTERED

POST   /api/v1/auth/login
  Request:  { email: string, password: string }
  Response: 200 { user: {...}, session: {...} }  + Set-Cookie
  Errors:   401 UNAUTHORIZED | 403 EMAIL_NOT_VERIFIED

POST   /api/v1/auth/logout
  Auth:     required
  Response: 204

POST   /api/v1/auth/forgot-password
  Request:  { email: string }
  Response: 200 { message: 'Reset link sent if email exists' }   # não revela existência
  Side-effect: envia email via Resend com magic link (TTL 1h)

POST   /api/v1/auth/reset-password
  Request:  { token: string, newPassword: string }
  Response: 200 { message: 'Password updated' }
  Errors:   401 TOKEN_INVALID | 410 TOKEN_EXPIRED

GET    /api/v1/auth/verify-email/:token
  Response: 200 { message: 'Email verified' }
  Errors:   401 TOKEN_INVALID | 410 TOKEN_EXPIRED

GET    /api/v1/professionals/me
  Auth:     required
  Response: 200 { id, name, professionType, credentialNumber, phone, email, emailVerified }

PATCH  /api/v1/professionals/me
  Auth:     required
  Request:  { name?, professionType?, credentialNumber?, phone? }
  Response: 200 { ...updatedProfessional }

POST   /api/v1/professionals/me/change-password
  Auth:     required
  Request:  { currentPassword: string, newPassword: string }
  Response: 200 { message: 'Password updated' }
  Errors:   401 INVALID_CURRENT_PASSWORD
```

### 3.5 Endpoints — Tenant Management: Companies & Departments (Slice VS-A)

```
GET    /api/v1/companies?page=1&limit=20&q=<search>
  Auth:     required
  Response: 200 { data: Company[], meta: PaginationMeta }
  Filter:   WHERE professional_id = $current AND is_active = true AND (name ILIKE %q% OR cnpj ILIKE %q%)

POST   /api/v1/companies
  Auth:     required
  Headers:  Idempotency-Key: <uuid>
  Request:  { name: string, cnpj: string (14 dígitos), cnaePrimary?: string,
              employeeCount?: number, city?: string, state?: string (UF),
              contactName?: string, contactEmail?: string, contactPhone?: string,
              dpoPoc?: string }
  Validation: CNPJ com dígitos verificadores válidos (algoritmo client+server)
  Response: 201 { id, name, cnpj, ... }
  Errors:   422 CNPJ_INVALID | 409 CNPJ_ALREADY_REGISTERED

GET    /api/v1/companies/:id
  Response: 200 { ...company, summary: { departmentsCount, lastAssessment? } }

PATCH  /api/v1/companies/:id
  Request:  { name?, cnaePrimary?, employeeCount?, city?, state?,
              contactName?, contactEmail?, contactPhone?, dpoPoc? }
  Nota:     CNPJ é imutável pós criação (razões regulatórias/LGPD)

DELETE /api/v1/companies/:id
  Side-effect: UPDATE is_active = false
  Errors:   409 DEPARTMENT_HAS_ACTIVE_ASSESSMENT (RB-08)

GET    /api/v1/companies/:id/departments
  Response: 200 { data: Department[] }

POST   /api/v1/companies/:id/departments
  Request:  { name: string, description?: string, workerCount: number (≥1) }
  Response: 201 { id, name, workerCount, ... }
  Errors:   409 DEPARTMENT_NAME_DUPLICATE

PATCH  /api/v1/companies/:id/departments/:deptId
  Request:  { name?, description?, workerCount? }

DELETE /api/v1/companies/:id/departments/:deptId
  Errors:   409 DEPARTMENT_HAS_ACTIVE_ASSESSMENT (RB-08)
```

**Validação Zod (compartilhada em `packages/validators/company.ts`):**

```typescript
import { z } from 'zod';

export const cnpjSchema = z.string().regex(/^\d{14}$/).refine(validateCnpjDigits, {
  message: 'CNPJ inválido — dígitos verificadores não conferem',
});

export const createCompanySchema = z.object({
  name: z.string().min(2).max(200),
  cnpj: cnpjSchema,
  cnaePrimary: z.string().regex(/^\d{4}-\d$/).optional(),
  employeeCount: z.number().int().positive().optional(),
  city: z.string().max(100).optional(),
  state: z.string().regex(/^[A-Z]{2}$/).optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
  dpoPoc: z.string().max(500).optional(),
});

export type CreateCompanyDTO = z.infer<typeof createCompanySchema>;
```

### 3.6 Endpoints — Assessment Engine & Token Minting (Slice VS-B)

```
GET    /api/v1/companies/:id/assessments
  Response: 200 { data: Assessment[] }   # ordenado por created_at DESC

POST   /api/v1/companies/:id/assessments
  Request:  { title: string, startDate?: date, endDate: date,
              departments: Array<{ departmentId: uuid, expectedResponses: number (≥1) }> }
  Validation: ≥ 1 departamento; endDate > startDate (ou startDate = today)
  Response: 201 { id, status: 'draft' }
  Side-effect: cria assessment_departments para cada entrada

GET    /api/v1/assessments/:id
  Response: 200 { ...assessment, departments: [{ id, name, expected, responded, isEligible }] }

PATCH  /api/v1/assessments/:id
  Allowed only if status IN ('draft', 'collecting')
  Request:  { title?, startDate?, endDate?, participationRegistration? }

POST   /api/v1/assessments/:id/launch
  Allowed only if status = 'draft'
  Side-effect:
    1. Valida endDate ≥ today
    2. Para cada assessment_department: gera N = ceil(expectedResponses × 1.5) tokens UUID v4
    3. UPDATE assessment.status = 'collecting', start_date = COALESCE(start_date, today)
    4. UPDATE assessment_departments.token_count = N
    5. Envia email de resumo ao profissional via Resend
  Response: 200 { status: 'collecting', totalTokens: number }
  Errors:   409 ASSESSMENT_NOT_DRAFT

POST   /api/v1/assessments/:id/close
  Allowed only if status = 'collecting'
  Side-effect:
    1. UPDATE assessment.status = 'processing'
    2. Enfileira job de scoring (async)
  Response: 202 { status: 'processing' }
  Errors:   409 ASSESSMENT_NOT_COLLECTING

GET    /api/v1/assessments/:id/progress
  Response: 200 {
    globalAdesao: number,                        # Σ responded / Σ expected (todas GHEs)
    byDept: Array<{ id, name, expected, responded, pct, isEligible }>
  }
  Cache: TanStack refetchInterval 30s no frontend
```

### 3.7 Endpoints — Worker Portal (Anônimo, Rate-Limited, Idempotente)

Estes endpoints são públicos (sem auth), expostos sob `/api/v1/respond/*`. Rate limiting configurado em 10 requests/min/IP via middleware Elysia.

```
GET    /api/v1/respond/dept/:assessmentDeptId
  Public; Rate-limit: 10/min/IP
  Side-effect:
    1. Valida assessment.status = 'collecting' AND assessment.end_date ≥ today
    2. Cria novo response_token (token = uuid v4, is_used = false)
    3. Retorna redirect URL: ${WORKER_APP_URL}/q/${token}
  Response: 302 Location: https://responder.dominio.com/q/<token>
  Errors:   404 ASSESSMENT_DEPT_NOT_FOUND | 409 ASSESSMENT_NOT_COLLECTING | 429 RATE_LIMIT_EXCEEDED

GET    /api/v1/respond/token/:token/status
  Public; Rate-limit: 10/min/IP
  Response: 200 {
    valid: boolean,                              # token existe?
    alreadyUsed: boolean,                        # is_used = true?
    assessmentOpen: boolean,                     # assessment.status = 'collecting' AND end_date ≥ today?
    answeredCount: number,                       # 0..40
    totalItems: 40
  }

GET    /api/v1/respond/token/:token/items
  Public; Rate-limit: 10/min/IP
  Response: 200 {
    items: Array<{ index: 1..40, dimensionCode: 'D1'..'D11', textPtBr: string, responseType: string }>,
    scale: Array<{ value: 1..5, label: string }>
  }
  Invariante: NUNCA retorna info de empresa, GHE ou profissional (RB-03)

POST   /api/v1/respond/token/:token/answer
  Public; Rate-limit: 10/min/IP
  Idempotente: upsert em (token_id, item_index)
  Request:  { itemIndex: 1..40, likertValue: 1..5 }
  Response: 200 { ok: true, answeredCount: number, totalItems: 40 }
  Errors:   403 TOKEN_ALREADY_USED (RB-01) | 422 VALIDATION_ERROR
  Nota:     Após complete, token marcado is_used = true; respostas tornam-se imutáveis

POST   /api/v1/respond/token/:token/complete
  Public; Rate-limit: 10/min/IP
  Validation: answeredCount = 40
  Side-effect (transação):
    1. UPDATE response_token SET is_used = true, used_at = now()
    2. UPDATE assessment_department SET response_count = response_count + 1
    3. IF response_count >= 5 AND is_eligible = false: UPDATE is_eligible = true
    4. Aciona scoring parcial (opcional, debounced) para refresh do dashboard
  Response: 200 { message: 'Obrigado pela sua participação' }
  Errors:   403 TOKEN_ALREADY_USED | 422 INCOMPLETE_ANSWERS (answeredCount < 40)
```

**Estratégia anti-fingerprinting do portal worker:**

- Headers `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- Sem cookies de sessão.
- Sem Set-Cookie em nenhuma resposta de `/respond/*`.
- Logs de acesso omitem IP após contagem para rate limit (IP não persistido).
- CORS restrito a `responder.dominio.com`.

### 3.8 Endpoints — Scoring Engine (Idempotente)

```
POST   /api/v1/assessments/:id/score
  Auth:     required
  Idempotency: upsert em dimension_results (RB-06)
  Side-effect:
    1. Para cada assessment_department elegível (N_g ≥ 5):
       a. Build answersMatrix: Map<itemIndex, number[]>
       b. Para cada dimensão D1..D11: aplicar Passos 1-5 da Seção 1.4
       c. Upsert em dimension_results
    2. Atualiza assessment_department.is_eligible (RB-10)
    3. UPDATE assessment.status = 'completed', completed_at = now()
  Response: 200 { status: 'completed', eligibleDepts: number, totalDimensions: number }
  Errors:   409 ASSESSMENT_NOT_PROCESSING (se status ≠ 'processing')

GET    /api/v1/assessments/:id/score/status
  Response: 200 { status: 'idle'|'running'|'completed', lastRunAt: timestamp? }
```

**Implementação do algoritmo (resumo TypeScript):**

```typescript
async function scoreDepartment(assessmentDeptId: string): Promise<void> {
  const usedTokens = await db.query.responseTokens.findMany({
    where: and(eq(responseTokens.assessmentDepartmentId, assessmentDeptId),
               eq(responseTokens.isUsed, true)),
  });
  const nResponses = usedTokens.length;
  const isEligible = nResponses >= 5;

  await db.update(assessmentDepartments)
    .set({ isEligible, responseCount: nResponses })
    .where(eq(assessmentDepartments.id, assessmentDeptId));

  if (!isEligible) return;

  const answersMatrix = await buildAnswersMatrix(usedTokens);
  const dimensions = await db.query.copsoqDimensions.findMany();

  for (const dim of dimensions) {
    const items = await getItemsForDimension(dim.code);
    const itemScores: number[][] = items.map(item =>
      (answersMatrix.get(item.index) ?? []).map(r => (r - 1) / 4 * 100)
    );
    const rawScore = mean(itemScores.flat());
    const riskScore = dim.direction === 'INVERTED' ? 100 - rawScore : rawScore;
    const riskLevel = riskScore <= 33 ? 'LOW' : riskScore <= 66 ? 'MEDIUM' : 'HIGH';
    const alpha = items.length >= 2 ? calculateCronbach(itemScores) : null;

    await db.insert(dimensionResults)
      .values({ assessmentDepartmentId: assessmentDeptId, dimensionCode: dim.code,
                rawScore, riskScore, riskLevel, cronbachAlpha: alpha, nResponses })
      .onConflictDoUpdate({
        target: [dimensionResults.assessmentDepartmentId, dimensionResults.dimensionCode],
        set: { rawScore, riskScore, riskLevel, cronbachAlpha: alpha, nResponses,
               calculatedAt: new Date() },
      });
  }
}
```

### 3.9 Endpoints — Analytics & Aggregation (k-anonymity enforcement)

```
GET    /api/v1/assessments/:id/dashboard
  Allowed only if status = 'completed'
  Response: 200 {
    kpis: {
      globalAdesao: number,
      ghesHighRisk: number,
      ghesMediumRisk: number,
      ghesIneligible: number,
      totalRespondents: number
    },
    heatmap: Array<{
      deptId: uuid, deptName: string, nResponses: number, isEligible: boolean,
      dimensions: Array<{ code: 'D1'..'D11', rawScore: number, riskScore: number,
                         riskLevel: 'LOW'|'MEDIUM'|'HIGH', cronbachAlpha: number|null }>
    }>,
    companyAvg: Array<{ code, weightedAvgRiskScore: number, riskLevel: 'LOW'|'MEDIUM'|'HIGH' }>,
    criticalDimensions: Array<{ code, name, avgRiskScore: number, affectedDepts: string[] }>
  }
  Invariante: heatmap inclui GHEs inelegíveis como linha com dimensions: null (RB-03)

GET    /api/v1/companies/:companyId/trend
  Response: 200 Array<{
    assessmentId: uuid, title: string, completedAt: timestamp,
    dimensions: Array<{ code, avgRiskScore: number }>
  }>
  Filtro: somente assessments com status = 'completed'
```

### 3.10 Endpoints — NR-1 Risk Inventory & Action Plan 5W2H

```
GET    /api/v1/assessments/:id/risk-inventory
  Response: 200 {
    autoItems: Array<RiskInventoryItem>,         # gerados a partir de scoring (MEDIUM/HIGH)
    manualItems: Array<RiskInventoryItem>        # AEP para lacunas F3,F9,F10,F11,F13
  }
  Side-effect (idempotente): se primeira chamada pós scoring, gera auto-items

POST   /api/v1/assessments/:id/risk-inventory/manual
  Request:  {
    assessmentDepartmentId?: uuid,                # null = empresa toda
    mteFactorCode: 'F1'..'F13',
    hazardDescription: string,
    possibleHarms: string,
    probability: 1..3, severity: 1..3,
    existingControls?: string, proposedMeasures?: string
  }
  Response: 201 { id, ... }

PATCH  /api/v1/risk-inventory-items/:itemId
  Request:  { hazardDescription?, possibleHarms?, probability?, severity?,
              existingControls?, proposedMeasures? }
  Side-effect: se probability OU severity mudaram, nível recalculado em runtime

DELETE /api/v1/risk-inventory-items/:itemId
  Allowed only if item.isManual = true
  Errors:   409 ITEM_NOT_MANUAL (itens automáticos não podem ser excluídos, apenas editados)

GET    /api/v1/assessments/:id/action-plan
  Response: 200 { id, actionItems: Array<ActionItem> }
  Side-effect (idempotente): cria action_plan se não existir

POST   /api/v1/assessments/:id/action-items
  Request:  {
    departmentId?: uuid, dimensionCode?: 'D1'..'D11', riskLevelTrigger?: 'LOW'|'MEDIUM'|'HIGH',
    what: string, why: string, who: string, where: string,
    whenDate: date (YYYY-MM-DD), how: string, estimatedCost?: number
  }
  Response: 201 { id, status: 'pending', ... }

PATCH  /api/v1/action-items/:itemId
  Request:  { what?, why?, who?, where?, whenDate?, how?, estimatedCost?, status? }
  Nota:     status mutável inline (RB-10 do módulo 10)

DELETE /api/v1/action-items/:itemId
  Hard delete (não soft)
```

### 3.11 Endpoints — Report Generation (PDF/DOCX Async, R2 Presigned URLs)

```
POST   /api/v1/assessments/:id/reports/generate
  Auth:     required
  Headers:  Idempotency-Key: <uuid>
  Validation (RB-04):
    1. assessment.status = 'completed'
    2. assessment.participation_registration IS NOT NULL
    3. EXISTS (SELECT 1 FROM assessment_departments WHERE assessment_id = :id AND is_eligible = true)
  Request:  {
    type: 'pdf'|'docx',
    metadata: {
      responsibleName: string,                  # default: professional.name
      credentialNumber: string,                 # default: professional.credentialNumber
      reportDate: date,                          # default: today
      notes?: string
    }
  }
  Side-effect:
    1. Cria reports row com status = 'processing'
    2. Enfileira job de geração assíncrona (queue)
  Response: 202 { reportId: uuid }
  Errors:   422 REPORT_PREREQUISITES_UNMET | 422 PARTICIPATION_NOT_REGISTERED

GET    /api/v1/reports/:reportId/status
  Response: 200 {
    status: 'processing'|'ready'|'error',
    downloadUrl?: string,                        # URL R2 pré-assinada (TTL 1h)
    fileSizeBytes?: number,
    generatedAt?: timestamp,
    errorMessage?: string
  }

GET    /api/v1/reports/:reportId/download
  Side-effect: se URL expirada, gera nova URL pré-assinada (TTL 1h)
  Response: 302 Location: <presigned R2 URL>
  Errors:   409 REPORT_NOT_READY | 410 REPORT_EXPIRED

GET    /api/v1/assessments/:id/reports
  Response: 200 { data: Array<Report> }     # histórico, ordenado por generated_at DESC
```

**Geração técnica (jobs assíncronos):**

- **PDF**: `@react-pdf/renderer` em worker Bun separado; dados injetados via props tipadas.
- **DOCX**: biblioteca `docx` (npm); programmatic document building, sem templates binários.
- **Storage key**: `reports/{professionalId}/{companyId}/{assessmentId}/{reportId}.{ext}`.
- **Invariante de privacidade (RB-03)**: documento contém apenas escores agregados; nunca `response_answers` individuais.

### 3.12 Validação de Payload (Zod), Rate Limiting e Idempotency Keys

**Estrutura de `packages/validators`:**

```
packages/validators/
├── src/
│   ├── company.ts          # createCompanySchema, updateCompanySchema, cnpjSchema
│   ├── department.ts       # createDepartmentSchema
│   ├── assessment.ts       # createAssessmentSchema, launchSchema
│   ├── worker.ts           # answerSchema, completeSchema
│   ├── inventory.ts        # manualRiskSchema, updateRiskSchema
│   ├── action.ts           # createActionSchema, updateActionSchema
│   ├── report.ts           # generateReportSchema
│   └── index.ts            # re-exports
```

**Rate limiting (middleware Elysia):**

```typescript
// apps/api/src/middleware/rate-limit.ts
import { rateLimit } from '@elysiajs/rate-limit';

export const workerRateLimit = rateLimit({
  max: 10,
  duration: 60_000,        // 1 min
  scoping: 'ip',
  pattern: '/api/v1/respond/*',
  errorResponse: { error: { code: 'RATE_LIMIT_EXCEEDED', message: '10 requests/min' } },
});
```

**Idempotency keys:**

- Header `Idempotency-Key: <uuid v4>` em POSTs mutacionais (`/companies`, `/assessments/:id/launch`, `/reports/generate`).
- Implementação: tabela `idempotency_keys` com `(key, professional_id, response_body, expires_at)`.
- TTL: 24h. Reenvio com mesmo key retorna resposta cacheada.

### 3.13 Background Jobs (Cron, Scoring, Expurgo)

| Job | Cron | Arquivo | RB |
|---|---|---|---|
| Encerramento automático de assessments expirados | `0 * * * *` (horário) | `apps/api/src/jobs/close-expired-assessments.ts` | RB-07 |
| Scoring de assessments em `processing` | `5 * * * *` (horário, offset 5min) | `apps/api/src/jobs/run-pending-scoring.ts` | RB-06 |
| Regeneração de URLs R2 expiradas | Sob demanda (lazy) | Handler em `GET /reports/:id/download` | — |
| Expurgo de `response_answers` antigas | `0 3 * * 0` (domingo 03:00) | `apps/api/src/jobs/purge-old-answers.ts` | Seção 2.9 |
| Cleanup de `idempotency_keys` expiradas | `0 4 * * *` (diário 04:00) | `apps/api/src/jobs/cleanup-idempotency.ts` | Seção 3.12 |

**Implementação do job RB-07:**

```typescript
// apps/api/src/jobs/close-expired-assessments.ts
export async function closeExpiredAssessments(): Promise<void> {
  const expired = await db.query.assessments.findMany({
    where: and(eq(assessments.status, 'collecting'),
               lt(assessments.endDate, sql`CURRENT_DATE`)),
  });
  for (const assessment of expired) {
    await db.update(assessments)
      .set({ status: 'processing' })
      .where(eq(assessments.id, assessment.id));
    await enqueueScoringJob(assessment.id);
  }
  logger.info({ count: expired.length }, 'closeExpiredAssessments: done');
}
```

**Observabilidade dos jobs:** cada execução registra em `job_runs` (tabela auxiliar): `{ job_name, started_at, finished_at, status, rows_affected, error? }`. Alertas disparados se `status = 'error'` em 3 ciclos consecutivos.

---

> **Checkpoint #3 — H2 #3 (FASE 3: Application Layer) concluída.** Próxima seção: **H2 #4 — FASE 4: Arquitetura de Frontend e Fluxos de UI / Presentation Layer** (12 H3, estimativa ~4.000 palavras, inclui design system, mapa de rotas, specs de componentes por módulo, state management, portal do trabalhador offline-first).

---

## 4. FASE 4 — Arquitetura de Frontend e Fluxos de UI / Presentation Layer (Vertical Slice: UI)

Esta fase especifica a camada de apresentação como dois builds independentes (`apps/web` para o profissional, `apps/worker` para o trabalhador) com contextos de navegador isolados. O design system é otimizado para densidade informacional (dashboards analíticos, tabelas 5W2H, heat maps) sem sacrificar a legibilidade. O portal do trabalhador é mobile-first, offline-tolerant e submete-se às restrições anti-fingerprinting declaradas na Seção 3.7. Toda a comunicação com o backend ocorre via TanStack Query v5, com cache keys hierárquicas e invalidação cirúrgica por slice.

### 4.1 Separação de Contextos

A aplicação principal e o portal do trabalhador residem em domínios distintos (`app.dominio.com` e `responder.dominio.com`) para garantir o isolamento de contexto de navegador exigido pela invariante de privacidade (RB-03). Esta separação impede qualquer compartilhamento de `localStorage`, `sessionStorage`, cookies ou cabeçalho `Referer` entre os dois contextos, eliminando vetores de correlação entre identidade do profissional e respostas do trabalhador.

| App | Domínio | Build | Auth | Cookies | Analytics |
|---|---|---|---|---|---|
| `apps/web` | `app.dominio.com` | React 19 + Vite, bundle principal + code-split por rota | Better Auth session | `httpOnly; secure; sameSite=Strict` | Permitido (PostHog self-hosted) |
| `apps/worker` | `responder.dominio.com` | React 19 + Vite, bundle único < 80 KB gzipped | Nenhuma | Zero | **Proibido** — sem PostHog, sem GA, sem Sentry user-identifying |
| `apps/api` | `api.dominio.com` | Elysia + Bun | Compartilhado com `app.dominio.com` | `sameSite=Strict` | Logs estruturados sem PII |

**Proibições explícitas no `apps/worker`:** nenhuma chamada a SDKs de analytics; nenhum uso de `navigator.sendBeacon`; nenhum armazenamento de IP; nenhum canvas/WebGL fingerprinting; nenhuma leitura de `User-Agent` para fins de tracking.

### 4.2 Mapa de Rotas e Hierarquia de Views

As rotas utilizam TanStack Router v1 (file-based, type-safe). A hierarquia reflete a estrutura de navegação da sidebar e os fluxos lineares declarados na visão de UX Lean MVP.

```
apps/web/src/routes/
├── __root.tsx                          # Layout com Sidebar + Breadcrumb
├── auth/
│   ├── login.tsx                       # /auth/login
│   ├── register.tsx                    # /auth/register
│   ├── verificar-email.tsx             # /auth/verificar-email
│   ├── esqueci-senha.tsx               # /auth/esqueci-senha
│   └── redefinir-senha.$token.tsx      # /auth/redefinir-senha/:token
├── painel.tsx                          # /painel (Módulo 12)
├── empresas/
│   ├── index.tsx                       # /empresas (Módulo 4 - lista)
│   └── $companyId.tsx                  # /empresas/:id (Módulo 4 - detalhe)
├── avaliacoes/
│   ├── $assessmentId.tsx               # /avaliacoes/:id (Módulo 5 - detalhe)
│   ├── $assessmentId.resultados.tsx    # /avaliacoes/:id/resultados (Módulo 8)
│   ├── $assessmentId.inventario.tsx    # /avaliacoes/:id/inventario (Módulo 9)
│   ├── $assessmentId.plano-de-acao.tsx # /avaliacoes/:id/plano-de-acao (Módulo 10)
│   └── $assessmentId.relatorio.tsx     # /avaliacoes/:id/relatorio (Módulo 11)
└── configuracoes.tsx                   # /configuracoes (Módulo 3)

apps/worker/src/routes/
├── r.$assessmentDeptId.tsx             # /r/:assessmentDeptId (redirect-only)
└── q.$token.tsx                        # /q/:token (questionário one-per-screen)
```

**Proteção de rotas:** `beforeLoad` em `__root.tsx` verifica sessão Better Auth; rotas `/auth/*` redirecionam para `/painel` se autenticadas; rotas protegidas redirecionam para `/auth/login?redirect=<rota>` se não autenticadas.

### 4.3 State Management (TanStack Query v5)

Cache centralizado via `QueryClient` configurado com estratégias por staleTime diferenciado. Mutations utilizam optimistic updates para feedback imediato e rollback automático em erro.

```typescript
// apps/web/src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < 2 && (error as HttpError).status >= 500,
      staleTime: 30_000,                  // 30s padrão
      gcTime: 5 * 60_000,                 // 5 min
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => showGlobalErrorToast(error as HttpError),
    },
  },
});

// Cache keys hierárquicas
export const queryKeys = {
  companies: {
    all: ['companies'] as const,
    list: (page: number, limit: number, q: string) => ['companies', 'list', page, limit, q] as const,
    detail: (id: string) => ['companies', 'detail', id] as const,
    departments: (companyId: string) => ['companies', companyId, 'departments'] as const,
  },
  assessments: {
    detail: (id: string) => ['assessments', id] as const,
    progress: (id: string) => ['assessments', id, 'progress'] as const,    // refetchInterval 30s
    dashboard: (id: string) => ['assessments', id, 'dashboard'] as const,
    riskInventory: (id: string) => ['assessments', id, 'risk-inventory'] as const,
    actionPlan: (id: string) => ['assessments', id, 'action-plan'] as const,
    reports: (id: string) => ['assessments', id, 'reports'] as const,
  },
  professional: {
    me: ['professional', 'me'] as const,
    dashboard: ['professional', 'dashboard'] as const,
  },
};
```

**Padrões de mutação:**

| Operação | Estratégia |
|---|---|
| `POST /companies` | Invalidate `['companies', 'list']` |
| `PATCH /companies/:id` | Optimistic update em cache `['companies', 'detail', id]` + invalidate list |
| `POST /assessments/:id/launch` | Optimistic status → `collecting` + invalidate progress |
| `POST /respond/token/:token/answer` | Sem cache (portal worker usa state local + persistência local) |
| `PATCH /action-items/:itemId` | Optimistic update em actionPlan + invalidate dashboard |

### 4.4 Design System

**Tokens de cor (CSS variables em `:root`):**

| Token | Hex | Aplicação |
|---|---|---|
| `--primary` | `#1E3A5F` | Nav ativa, CTAs primários, headers |
| `--primary-light` | `#2D5A8E` | Hover, badges primários |
| `--secondary` | `#2D6A4F` | Status conforme, confirmações |
| `--accent` | `#E07B39` | CTAs secundários, destaques |
| `--risk-high` | `#D44E3C` | Risco alto (HIGH) |
| `--risk-medium` | `#E8A020` | Risco médio (MEDIUM) |
| `--risk-low` | `#3D8C6B` | Risco baixo/favorável (LOW) |
| `--surface` | `#F7F9FC` | Background global |
| `--surface-card` | `#FFFFFF` | Cards, modais, painéis |
| `--border` | `#DDE3EC` | Bordas, separadores |
| `--text-primary` | `#1A2535` | Texto principal |
| `--text-muted` | `#64748B` | Labels, descrições, legendas |

**Tipografia:**

| Família | Pesos | Aplicação |
|---|---|---|
| Inter | 700, 800 | Títulos de seção, nomes de empresa, nomes de dimensão em destaque |
| Inter | 400, 500 | Body text, todo conteúdo de interface |
| IBM Plex Mono | 400 | CNPJs, escores numéricos, tokens, datas ISO, identificadores técnicos |

**Escala tipográfica (rem, base 16px):** 0.6875rem (label micro 11px) · 0.8125rem (caption 13px) · 0.875rem (body sm 14px) · 1rem (body 16px) · 1.25rem (h4 20px) · 1.5rem (h3 24px) · 2rem (h2 32px).

### 4.5 Component Specs — Painel Multi-Cliente (Módulo 12)

**Rota:** `/painel` · **Estado:** autenticado · **Dados:** `GET /professionals/me/dashboard`

| Componente | Props | Comportamento |
|---|---|---|
| `AlertsBanner` | `alerts: Alert[]` | Banner dismissível no topo. Variants por tipo: `no_assessment` (cinza), `low_adhesion` (amarelo), `action_overdue` (laranja), `review_recommended` (amarelo) |
| `CompanyCard` | `company: CompanySummary` | Card 3-col desktop / 1-col mobile. Exibe nome, CNPJ mascarado `XX.XXX.XXX/XXXX-XX`, badge NR-1, último ciclo, taxa adesão, nª GHEs alto risco, CTA "Acessar" |
| `NrStatusBadge` | `status: 'no_assessment'\|'collecting'\|'completed'\|'review_recommended'` | Variants de cor conforme token. Texto sempre presente (acessibilidade) |
| `ActivityFeed` | `activities: Activity[]` | Lista scrollável de últimas 10 ocorrências. Ícone + descrição + empresa + data relativa ("há 2 dias") |

**Estado vazio:** sem empresas cadastradas → "Nenhuma empresa cadastrada. Adicione seu primeiro cliente." + CTA `+ Nova Empresa`.

### 4.6 Component Specs — Empresas e Departamentos (Módulo 4)

**Rotas:** `/empresas` (lista), `/empresas/:id` (detalhe)

| Componente | Localização | Comportamento |
|---|---|---|
| `CompanyGrid` | `/empresas` | Grid de cards 3-col. Busca por nome/CNPJ com debounce 300ms. Paginação 20 itens |
| `CompanyForm` | modal | Campos: `name*`, `cnpj*` (máscara + validação DV em tempo real), `cnaePrimary`, `employeeCount`, `city`, `state` (select UF), `contactName`, `contactEmail`, `contactPhone`, `dpoPoc`. Submit via `POST /companies` com header `Idempotency-Key` |
| `CompanyDetailHeader` | `/empresas/:id` | Exibe nome, CNPJ, cidade/UF, CNAE, nª funcionários, contato |
| `CompanyTabs` | `/empresas/:id` | Tabs: Visão Geral \| Departamentos \| Avaliações (link para módulo 5) |
| `DepartmentTable` | tab Departamentos | Colunas: nome, nª trabalhadores, status (ativo/inativo), ações (editar, desativar). Botão `+ Departamento` |
| `DepartmentForm` | modal | Campos: `name*`, `description?`, `workerCount*` (≥1) |

**Estado vazio (sem empresas):** "Nenhuma empresa cadastrada. Adicione seu primeiro cliente." + CTA primário.

### 4.7 Component Specs — Wizard de Avaliação (Módulo 5, 3 etapas)

**Rota:** `/empresas/:id/avaliacoes` (lista) → wizard como modal/drawer

| Etapa | Componente | Campos |
|---|---|---|
| 1 — Configurar Ciclo | `WizardStep1Cycle` | `title*` (ex: "1º Ciclo 2025"), instrumento fixo `COPSOQ II-BR Versão Curta (40 itens)`, `startDate` (default today), `endDate*` (obrigatório) |
| 2 — Selecionar Departamentos | `WizardStep2Depts` | Lista de GHEs ativos com checkbox; para cada selecionado, campo editável `expectedResponses` (pré-preenchido com `workerCount`). Aviso inline: "GHEs com menos de 5 respondentes não terão resultados exibidos individualmente." |
| 3 — Revisão e Lançamento | `WizardStep3Review` | Resumo: ciclo, período, GHEs selecionados, total respondentes esperados. CTA `Lançar Avaliação` → `POST /assessments/:id/launch` |

**Detalhe do ciclo (`/avaliacoes/:id`):**

| Componente | Props | Comportamento |
|---|---|---|
| `AssessmentHeader` | `assessment: Assessment` | Título, instrumento, período, status badge, adesão global (ring animado) |
| `AdesaoRing` | `pct: number` | Anel SVG animado. Cor: cinza (<30%) → `--risk-medium` (30–69%) → `--risk-low` (≥70%) |
| `GheProgressCards` | `byDept: DeptProgress[]` | Cards por GHE: nome, esperados, respondidos, % adesão, status elegibilidade |
| `ParticipationField` | `value: string` | Textarea. Label: "Registre como os trabalhadores foram comunicados." Salva via `PATCH /assessments/:id` com debounce 1s |
| `CollectionLinks` | `assessmentDepts: AssessmentDept[]` | Por GHE: link base `${WORKER_APP_URL}/r/${assessmentDeptId}` + botão "Copiar mensagem WhatsApp" com template pré-formatado |

**Polling de progresso:** `useQuery({ queryKey: ['assessments', id, 'progress'], refetchInterval: 30_000 })`. Pausa automaticamente quando `status !== 'collecting'`.

### 4.8 Component Specs — Portal do Trabalhador (Módulo 6, One-per-Screen, Offline-First)

**Rota:** `/q/:token` · **App:** `apps/worker` · **Auth:** nenhuma

**Estrutura de 3 telas sequenciais:**

| Tela | Componente | Conteúdo |
|---|---|---|
| 1 — Boas-vindas | `WorkerWelcome` | Título "Pesquisa sobre Condições de Trabalho". Texto explicativo reforçando anonimato, voluntariedade, duração ~15 min. CTA "Começar" |
| 2 — Questões | `WorkerQuestionItem` | Progress bar topo (item atual / 40). Texto da questão em destaque (Inter 20px). 5 botões Likert empilhados verticalmente, `min-height: 56px`, `width: 100%`. Labels: Nunca/quase nunca, Raramente, Às vezes, Frequentemente, Sempre/quase sempre |
| 3 — Finalização | `WorkerThanks` | "Obrigado pela sua participação. Suas respostas foram registradas." Nenhum resultado exibido. Nenhum link adicional |

**Comportamento de resposta (one-per-screen):**

1. Usuário seleciona botão Likert.
2. Persistência local imediata: `localStorage.setItem('answers', JSON.stringify({...current, [itemIndex]: likertValue}))`.
3. POST `/respond/token/:token/answer` com idempotência (upsert server-side).
4. Se online: aguardar 200 OK → avançar para próxima questão após 300ms.
5. Se offline: avançar imediatamente; flag `pendingSync: true` no localStorage.
6. Ao reabrir com mesmo token: `GET /respond/token/:token/status` retorna `answeredCount`; sincroniza diferenças e retoma da questão seguinte à última respondida.

**Sem botão "Voltar":** evita manipulação retroativa de respostas. Edição de resposta anterior só é possível enquanto token não estiver `is_used` (RB-01 pós-complete bloqueia).

**Estados de erro:**

| Estado | Mensagem |
|---|---|
| `TOKEN_INVALID` | "Este link é inválido ou não existe." |
| `TOKEN_ALREADY_USED` | "Este link já foi utilizado. Cada link pode ser usado apenas uma vez." |
| `TOKEN_ASSESSMENT_CLOSED` | "Esta pesquisa está encerrada." |
| `RATE_LIMIT_EXCEEDED` | "Muitas tentativas. Aguarde alguns minutos." |

**Footer discreto em todas as telas:** "Pesquisa confidencial — suas respostas são anônimas".

### 4.9 Component Specs — Dashboard Analítico (Módulo 8)

**Rota:** `/avaliacoes/:id/resultados` · **Disponível somente se `assessment.status === 'completed'`** · **Dados:** `GET /assessments/:id/dashboard`

| Componente | Dados Consumidos | Especificação |
|---|---|---|
| `HeatMap` | `heatmap: HeatmapRow[]` | Tabela GHE (linhas) × Dimensão D1-D11 (colunas). Células coloridas por `riskLevel`. Texto: `riskScore.toFixed(0)`. Hover: tooltip `{dim} — {GHE}: bruto {raw}, risco {risk}, N={n}`. GHEs inelegíveis: linha cinza com cadeado "< 5 respostas". α<0.5: ícone ⚠ com tooltip "Baixa confiabilidade" |
| `ScoreCell` | `riskScore, riskLevel, rawScore, cronbachAlpha, nResponses` | `<td>` com background interpolado verde→amarelo→vermelho. Texto branco quando `riskScore > 50`. Accessible: `aria-label` com escore numérico |
| `DimensionRadar` | `dimensions: DimensionResult[]` | Recharts RadarChart. 11 eixos normalizados 0-100 (`riskScore`). Area fill `opacity: 0.3`. Paleta distinta por GHE se sobrepostos |
| `CompanyAvgBars` | `companyAvg: CompanyAvg[]` | Bar chart horizontal. Cada barra = média ponderada (`nResponses` peso). Cor por nível. Linhas de referência verticais em 33 e 66. Labels: nome (esq), valor (dir) |
| `DashboardKpis` | `kpis: Kpis` | Cards: Adesão Global (%), GHEs Alto Risco (N), GHEs Médio (N), GHEs Inelegíveis (N), Total Respondentes |
| `CriticalDimensionsTable` | `criticalDimensions: CriticalDim[]` | Lista dimensões `riskLevel = HIGH` ordenadas por `avgRiskScore` desc. Colunas: nome, GHEs afetados (chips), escore médio. CTAs: `→ Inventário` (link c/ pré-filtro), `→ Ação` (link c/ pré-preenchimento) |
| `CycleComparisonChart` | `trend: CycleTrend[]` | Condicional: somente se ≥ 2 assessments `completed` para a empresa. Line chart evolução de `riskScore` médio por dimensão entre ciclos |

**Linguagem não-clínica:** todo texto no dashboard evita "diagnóstico", "transtorno", "doença". Usa "fator de risco", "dimensão psicossocial", "condições de trabalho".

### 4.10 Component Specs — Inventário de Riscos Editável Inline (Módulo 9)

**Rota:** `/avaliacoes/:id/inventario` · **Dados:** `GET /assessments/:id/risk-inventory`

| Componente | Comportamento |
|---|---|
| `InventoryTable` | Tabela editável inline. Colunas: GHE, Fator FRPRT MTE, Perigo Identificado, Possíveis Danos, Probabilidade (select 1-3), Severidade (select 1-3), Nível (calculado), Controles Existentes, Medidas Propostas (link "Criar Ação"). Edição via click-to-edit; submit on blur |
| `RiskLevelCell` | Renderiza LOW/MEDIUM/HIGH calculado em runtime: `P × S` → LOW(1-2), MEDIUM(3-4), HIGH(6-9). Recalcula ao mudar P ou S |
| `ManualRiskForm` | Modal "Adicionar Risco Manual" (AEP). Campos: GHE (select), Fator FRPRT MTE (select F1-F13), Perigo*, Danos*, P*, S*, Controles, Medidas. Submit via `POST /risk-inventory/manual` |
| `UncoveredFactorsSection` | Seção colapsável abaixo da tabela. Lista F3, F9, F10, F11, F13 com explicação "não coberto pelo COPSOQ II-BR". Botão `+ Adicionar` abre `ManualRiskForm` pré-preenchido com `mteFactorCode` |

**Pré-preenchimento automático:** ao acessar a página pela primeira vez pós-scoring, sistema gera `risk_inventory_items` para cada combinação `GHE elegível × dimensão com riskLevel IN (MEDIUM, HIGH)`. Templates de `hazardDescription` e `possibleHarms` por dimensão são seed data editáveis.

### 4.11 Component Specs — Plano de Ação 5W2H (Módulo 10)

**Rota:** `/avaliacoes/:id/plano-de-acao` · **Dados:** `GET /assessments/:id/action-plan`

| Componente | Comportamento |
|---|---|
| `PlanHeaderKpis` | Cards: Total Ações, Pendentes, Em Andamento, Concluídas, % dimensões HIGH com ≥1 ação concluída |
| `PlanFilters` | Filtros: status, GHE, dimensão, responsável. Combinações via URL search params (TanStack Router type-safe) |
| `ActionItemsTable` | Colunas: GHE, Dimensão (badge), O Quê, Responsável, Prazo (badge "Vencido" se `whenDate < today`), Status (select inline), Ações (editar, excluir). Ordenação padrão: status asc, prazo asc |
| `ActionItemForm` | Modal de criação/edição. Campos 5W2H: `what*`, `why*`, `who*`, `where*`, `whenDate*` (datepicker), `how*`, `estimatedCost?` (moeda BRL). Selects: GHE afetado (opcional, "Toda a empresa"), Dimensão (D1-D11, opcional), Nível de risco que originou (auto-preenchido se vindo de atalho) |
| `OverdueBadge` | Badge vermelho "Vencido" para `whenDate < today AND status IN ('pending', 'in_progress')` |

**Atalhos cross-módulo:**

| Origem | Destino | Pré-preenchimento |
|---|---|---|
| Módulo 8 — dimensão crítica → "Ação" | Modal `ActionItemForm` | `dimensionCode`, `riskLevelTrigger` |
| Módulo 9 — "Criar Ação" em Medidas Propostas | Modal `ActionItemForm` | `departmentId`, `dimensionCode`, `what` (com texto de proposedMeasures) |

**Nota informativa NR-1:** banner no topo do modal — "NR-1 orienta priorizar medidas na organização do trabalho antes de ações individuais."

### 4.12 Component Specs — Relatório PGR (Módulo 11, Preview + Prerequisites)

**Rota:** `/avaliacoes/:id/relatorio` · **Dados:** `GET /assessments/:id/reports`

| Componente | Comportamento |
|---|---|
| `PrerequisitesChecklist` | Checklist inline com ✓/✗: Avaliação concluída, Evidência de participação registrada, ≥1 GHE elegível, Inventário revisado, Plano de ação criado (opcional). Botão "Gerar PDF/DOCX" desabilitado enquanto (a), (b), (c) não atendidos |
| `ReportMetadataForm` | Campos editáveis antes de gerar: `responsibleName` (default `professional.name`), `credentialNumber` (default `professional.credentialNumber`), `reportDate` (default today), `notes` (textarea) |
| `ReportOutline` | Outline colapsável com as 6 seções do documento (Identificação, Metodologia, Identificação de Perigos, Avaliação, Plano de Ação, Monitoramento) + Apêndices |
| `LowAdhesionWarning` | Alerta amarelo condicional: "A taxa de adesão foi de X%. O relatório incluirá nota de limitação interpretativa." Exibido se `globalAdesao < 60%` |
| `GenerateButtons` | Dois CTAs: `Gerar PDF` \| `Gerar DOCX`. Ambos acionam `POST /assessments/:id/reports/generate` com `Idempotency-Key` |
| `ReportsHistory` | Tabela com data de geração, tipo, tamanho, link de download (R2 presigned URL TTL 1h). Botão "Regerar" para sobrescrever |
| `ReportStatusPoll` | Após gerar, polling `GET /reports/:reportId/status` a cada 5s até `status === 'ready'` ou `'error'`. Toast de sucesso → habilita botão download |

**Estrutura do documento gerado (6 seções + apêndices):** conforme especificado na Seção 11.2 da SPEC original — Cabeçalho, Identificação, Metodologia, Identificação de Perigos, Avaliação de Riscos, Plano de Ação 5W2H, Monitoramento e Revisão, Apêndices (escores completos, heat map renderizado como imagem, assinatura).

---

> **Checkpoint #4 — H2 #4 (FASE 4: Presentation Layer) concluída.** Próxima seção: **H2 #5 — FASE 5: Cross-Cutting Concerns, NFRs e Observabilidade** (5 H3, estimativa ~2.000 palavras, inclui segurança LGPD, NFRs de performance, observabilidade, CI/CD, critérios de aceitação consolidados por Vertical Slice).

---

## 5. FASE 5 — Cross-Cutting Concerns, NFRs e Observabilidade

Esta fase consolida os requisitos não-funcionais (NFRs) e as preocupações transversais que atravessam todos os Vertical Slices: segurança e conformidade LGPD, performance observável, pipeline de CI/CD e critérios de aceitação verificáveis por slice. As métricas aqui estabelecidas são monitoradas continuamente em produção e gates de deploy impedem promoção de builds que violem quaisquer SLOs declarados. Toda decisão arquitetural nas fases anteriores deve ser auditável contra esta seção.

### 5.1 Segurança e LGPD (Privacy by Design)

A plataforma adota **Privacy by Design** como princípio arquitetural fundamental, materializado em sete invariantes técnicas que garantem conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018) e habilitam a base legal de cumprimento de obrigação regulamentar (art. 7º, II) para o processamento de dados do trabalhador.

**Princípios LGPD implementados:**

| Princípio (art. 6º LGPD) | Implementação Técnica |
|---|---|
| Finalidade | Dados do trabalhador coletados exclusivamente para avaliação psicossocial NR-1; sem uso secundário |
| Adequação | Compatibility entre finalidade (NR-1) e tratamento (COPSOQ II-BR) |
| Necessidade | Minimização: portal worker coleta apenas token UUID + 40 valores Likert + timestamp |
| Livre acesso | Trabalhador: tecnicamente inexercível por design (dados anonimizados, art. 12, III LGPD). Profissional: endpoint `GET /professionals/me` |
| Qualidade dos dados | Validação Zod em todos os endpoints; constraints CHECK no schema |
| Transparência | Termos de Uso do profissional documentam design anonimizador; texto explicativo no portal worker |
| Segurança | HTTPS obrigatório, HSTS, TLS 1.2+, RLS, rate limiting, httpOnly cookies |
| Prevenção | Soft delete com proteção RB-08; expurgo programado de `response_answers` |
| Não discriminação | Dados não utilizados para decisões individuais sobre trabalhadores |
| Responsabilização e prestação de contas | DPO da empresa cliente registrado em `companies.dpo_poc`; RIPD documentado |

**Bases legais por categoria de dado:**

| Categoria | Base Legal (art. 7º LGPD) | Justificativa |
|---|---|---|
| Dados do trabalhador (anonimizados) | Art. 7º, II — cumprimento de obrigação legal (NR-1) | Dados anonimizados não se enquadram como dados pessoais (art. 12, III) |
| Dados do profissional | Art. 7º, V — execução de contrato | Prestação de serviço SaaS |
| Dados da empresa cliente | Art. 7º, V — execução de contrato | Cadastro de cliente |
| Logs de auditoria | Art. 7º, II — cumprimento de obrigação legal | Retenção para fiscalização MTE |

**Controles técnicos obrigatórios:**

1. HTTPS obrigatório em todos os domínios; HSTS com `max-age=31536000; includeSubDomains; preload`.
2. TLS 1.2+; cifras preferencialmente TLS 1.3 (ECDHE + AES-GCM).
3. Sessões Better Auth: cookies `httpOnly; secure; sameSite=Strict`; expiração 7 dias; renovação a cada 24h de atividade.
4. Rate limiting portal worker: 10 req/min/IP em `/respond/*` (middleware Elysia).
5. CSRF: protegido via Better Auth (tokens sameSite=Strict).
6. SQL injection: Drizzle ORM com parameterized queries; queries raw proibidas exceto em migrations.
7. XSS: DOMPurify em qualquer conteúdo editável pelo usuário renderizado no frontend; CSP headers restritivos.
8. Secrets: gerenciados via Infisical; nunca commitados em repositório; rotação a cada 90 dias para `BETTER_AUTH_SECRET`.
9. R2 storage: URLs pré-assinadas com TTL máximo 1h; buckets sem acesso público; encryption at-rest habilitada.
10. Headers de segurança: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (portal worker) / `strict-origin-when-cross-origin` (app principal).

**Transferência internacional (art. 33 LGPD):** contratos de processamento de dados (DPA) com Neon (AWS us-east-1), Cloudflare R2, Resend. Cláusulas-padrão ANPD ou certificação equivalente.

### 5.2 NFRs de Performance

| NFR | Métrica | SLO | Mecanismo de Medição |
|---|---|---|---|
| Latência p95 — `GET /companies` | p95 | ≤ 200 ms | APM (Sentry Performance ou OpenTelemetry) |
| Latência p95 — `GET /assessments/:id/dashboard` | p95 | ≤ 500 ms (inclui agregação) | APM |
| Latência p95 — `GET /respond/token/:token/status` | p95 | ≤ 100 ms (hot path portal worker) | APM |
| Latência p95 — `POST /respond/token/:token/answer` | p95 | ≤ 150 ms | APM |
| Throughput portal worker | req/s sustentável | ≥ 100 req/s | Load test k6 |
| Tempo de scoring (assessments ≤ 5 GHEs) | Tempo total | ≤ 5 s | Logs `job_runs` |
| Tempo de scoring (assessments ≤ 50 GHEs) | Tempo total | ≤ 30 s | Logs `job_runs` |
| Tempo de geração de PDF | Tempo total | ≤ 30 s | Logs `job_runs` |
| Tempo de geração de DOCX | Tempo total | ≤ 15 s | Logs `job_runs` |
| Tempo de carregamento inicial `apps/web` (LCP) | LCP p75 | ≤ 2.5 s | Vercel Web Vitals |
| Tempo de carregamento inicial `apps/worker` (LCP) | LCP p75 | ≤ 1.5 s (bundle < 80 KB gzip) | Vercel Web Vitals |
| Disponibilidade API | Uptime mensal | ≥ 99.5% | Fly.io status + uptime monitor |
| Disponibilidade portal worker | Uptime mensal | ≥ 99.9% (crítico para coleta) | Vercel status |
| Cobertura de testes | % linhas | ≥ 80% backend, ≥ 70% frontend | Codecov |

**Estratégias de cache:**

| Camada | Mecanismo | TTL |
|---|---|---|
| Banco de dados | Connection pooling Neon | — |
| Aplicação | In-memory LRU para `copsoq_items` e `copsoq_dimensions` (imutáveis) |∞ (invalidado apenas em deploy) |
| HTTP | `Cache-Control: private, max-age=30` em `GET /assessments/:id/progress` | 30s |
| CDN (Vercel) | Edge cache para assets estáticos do `apps/worker` | 1 ano (com hash no filename) |
| Browser (TanStack Query) | `staleTime: 30s` padrão | 30s |

### 5.3 Observabilidade

**Três pilares de observabilidade:**

| Pilar | Implementação | Retenção |
|---|---|---|
| Logs estruturados | Pino (Bun) com formato JSON; campos: `timestamp, level, request_id, professional_id?, action, duration_ms, status` | 90 dias (hot) + 1 ano (cold, S3) |
| Métricas | Prometheus via `@elysiajs/prometheus`; endpoint `/metrics` scrapeado por Grafana Cloud | 13 meses |
| Tracing distribuído | OpenTelemetry SDK; traces exportados para Tempo/Jaeger; sampling 10% em produção | 30 dias |

**Métricas canônicas expostas:**

```
http_requests_total{method, route, status}              # Counter
http_request_duration_seconds{method, route}             # Histogram (buckets p50/p95/p99)
assessments_active{status}                               # Gauge
scoring_jobs_running                                     # Gauge
scoring_jobs_duration_seconds                            # Histogram
reports_generation_duration_seconds{type}                # Histogram
response_tokens_created_total                            # Counter
response_tokens_used_total                               # Counter
```

**Audit trail (tabela `audit_logs`):**

```sql
CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id),
  action        text NOT NULL,             -- 'company.create', 'assessment.launch', etc.
  resource_type text NOT NULL,
  resource_id   uuid,
  metadata      jsonb,
  ip_address    inet,                      -- apenas profissional autenticado (nunca worker)
  user_agent    text,
  created_at    timestamp DEFAULT now() NOT NULL
);
CREATE INDEX idx_audit_professional ON audit_logs(professional_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
```

**Teste de auditoria automatizado RB-03 (privacy invariant):**

Job diário (`0 5 * * *`) que verifica:

1. Nenhum endpoint expõe `response_answers` individualmente.
2. Logs de acesso não contêm campos correlacionáveis (token + IP persistido simultaneamente).
3. Tabela `audit_logs` para endpoints `/respond/*` contém apenas `resource_type = 'response_token'` sem `professional_id` e sem `ip_address`.

Violações disparam alerta crítico (PagerDuty) e bloqueiam deploy até resolução.

**Alertas:**

| Alerta | Condição | Severidade |
|---|---|---|
| Latência p95 portal worker > 200ms | 5 min contínuo | Warning |
| Latência p95 dashboard > 1s | 5 min contínuo | Warning |
| Scoring job falhando | 3 ciclos consecutivos | Critical |
| Report generation falhando | 3 jobs em 1h | Critical |
| Rate limit hits > 1000/min em `/respond/*` | Possível abuso | Critical |
| Cobertura de testes < 80% backend | Push em `main` | Block deploy |
| Audit RB-03 violation | Imediato | Critical (page on-call) |

### 5.4 CI/CD e Ambiente

**Pipeline GitHub Actions (3 ambientes):**

| Ambiente | Branch | Neon Branch | Deploy | Gate |
|---|---|---|---|---|
| `development` | local | `dev` | localhost via `bun dev` | — |
| `staging` | `develop` | `staging` | Fly.io (staging) + Vercel preview | Auto após PR merge |
| `production` | `main` | `main` | Fly.io (prod) + Vercel prod | Manual approval |

**Jobs do pipeline (PR para `develop`):**

```yaml
name: CI
on: [pull_request]
jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
  test:
    runs-on: ubuntu-latest
    needs: lint-typecheck
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run db:migrate -- --env test
      - run: bun run db:seed -- --env test
      - run: bun test --coverage
      - uses: codecov/codecov-action@v4
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: actions/upload-artifact@v4
```

**Deploy produção (push em `main`):**

1. Workflow `deploy-prod.yml` acionado.
2. Step `migration-gate` exige aprovação manual de 2 revisores.
3. `drizzle-kit migrate` executado no Neon branch `main`.
4. Build & deploy Fly.io (API) — rolling strategy, health check em `/healthz`.
5. Build & deploy Vercel (apps/web + apps/worker) — atomic swap.
6. Smoke tests pós-deploy: `bun run test:smoke -- --env prod`.
7. Rollback automático se smoke tests falharem.

**Estrutura de repositório (monorepo Turborepo):**

```
/
├── apps/
│   ├── web/              → React + Vite (frontend principal)
│   ├── worker/           → React + Vite (portal do trabalhador)
│   └── api/              → Elysia + Bun (backend)
├── packages/
│   ├── db/               → Drizzle schema + migrations + seed
│   ├── types/            → tipos TypeScript compartilhados (DTOs, enums)
│   └── validators/       → schemas Zod compartilhados
├── turbo.json
├── package.json          → workspace root
├── .env.example
├── .github/workflows/
│   ├── ci.yml
│   ├── deploy-staging.yml
│   └── deploy-prod.yml
└── README.md
```

### 5.5 Critérios de Aceitação Consolidados por Vertical Slice

Cada Vertical Slice é validado quando todos os critérios abaixo são satisfeitos. Builds que não atendem 100% dos critérios do slice em escopo não são promovidos para staging.

**VS-A: Tenant Management (Módulos 0, 1, 2, 3, 4):**

- [ ] `bun dev` sobe os 3 apps sem erros
- [ ] `drizzle-kit migrate` aplica schema no banco dev sem erros
- [ ] `bun db:seed` popula 40 itens e 11 dimensões COPSOQ
- [ ] Registro cria usuário e `professional`; e-mail de confirmação enviado via Resend
- [ ] Login retorna cookie de sessão; rotas protegidas sem sessão retornam 401
- [ ] Criação de empresa valida CNPJ (dígitos verificadores) e bloqueia CNPJ inválido
- [ ] Listagem filtra por `professional_id` (RB-02 tenant isolation)
- [ ] CRUD de departamentos funcional; nome único por empresa
- [ ] Soft delete de empresa/departamento bloqueado quando há assessment ativo (RB-08)
- [ ] RLS policies ativas; teste cross-tenant retorna 403

**VS-B: Assessment Engine (Módulos 5, 6, 7):**

- [ ] Wizard cria assessment e `assessment_departments` corretamente
- [ ] Lançamento gera `N = ceil(expectedResponses × 1.5)` tokens por GHE
- [ ] Link de GHE gera token on-demand e redireciona para portal worker
- [ ] Portal worker: fluxo completo end-to-end (boas-vindas → 40 questões → finalização)
- [ ] Salvar incremental funciona (fechar e reabrir retoma da questão correta)
- [ ] Token marcado `is_used = true` após `complete`; segundo acesso exibe erro (RB-01)
- [ ] `response_count` incrementa corretamente após cada `complete`
- [ ] Scoring: `dimension_results` contém 11 registros por GHE elegível
- [ ] GHE com $N_g < 5$ marcado `is_eligible = false`; nenhum resultado gerado (RB-10)
- [ ] Dimensões INVERTIDAS têm `riskScore = 100 − rawScore`
- [ ] Classificação LOW/MEDIUM/HIGH correta nos limites exatos (33, 66)
- [ ] Cronbach's α calculado e persistido; NaN para D11 (k=1)
- [ ] Scoring idempotente: executar 2x produz mesmo resultado (RB-06)
- [ ] Job cron encerra avaliações expiradas (RB-07)
- [ ] Build do `apps/worker` não contém referências a auth ou dados do profissional

**VS-C: Analytics & NR-1 Documentation (Módulos 8, 9, 10, 11):**

- [ ] Heat map exibe todas as células com cores corretas
- [ ] GHE inelegível exibido como linha bloqueada (cadeado + "< 5 respostas")
- [ ] Células com α < 0.5 exibem ícone de aviso
- [ ] Radar chart renderiza para 1 GHE e para múltiplos GHEs sobrepostos
- [ ] KPIs refletem dados reais do scoring
- [ ] Comparativo de ciclos só aparece quando há ≥ 2 ciclos completos
- [ ] Geração automática de inventário cria itens para MEDIUM e HIGH em GHEs elegíveis
- [ ] Templates de texto pré-preenchidos editáveis e salvos
- [ ] Probabilidade/severidade iniciais corretas por `riskLevel`
- [ ] Nível do inventário recalcula ao mudar P ou S
- [ ] Adição manual de risco AEP funcional; itens automáticos não excluíveis
- [ ] Criação de ação salva 7 campos 5W2H
- [ ] Status mutável inline; badge "Vencido" aparece corretamente
- [ ] Pré-requisitos do relatório bloqueiam geração com erros claros (RB-04)
- [ ] PDF gerado contém 6 seções + apêndices corretamente preenchidos
- [ ] DOCX abre editável no Word
- [ ] Download via URL pré-assinada R2 funciona (expira após 1h)
- [ ] Se adesão < 60%, relatório contém nota de limitação (RB-09)
- [ ] Dados de resposta individual nunca aparecem no documento (RB-03)

**VS-D: Multi-Client Operations (Módulo 12):**

- [ ] Cards de empresa exibem status NR-1 correto baseado no último ciclo
- [ ] Alertas aparecem para: sem avaliação, adesão baixa, ação vencida, revisão recomendada
- [ ] Feed de atividade exibe eventos recentes
- [ ] Empresa sem dados exibe card com estado vazio acionável
- [ ] Busca por nome funciona no grid

**Critérios transversais (aplicam-se a todos os slices):**

- [ ] Cobertura de testes ≥ 80% backend, ≥ 70% frontend
- [ ] Lint sem erros; typecheck sem erros
- [ ] Sem violações de CSP em produção
- [ ] Audit RB-03 sem violações
- [ ] Latência p95 dentro dos SLOs declarados (Seção 5.2)
- [ ] Documentação OpenAPI gerada a partir de tipos Elysia publicada em `/docs/api`

---

*EOF — NR-1 / COPSOQ II-BR SaaS Platform Technical Specification SSOT v3.0*

*Referências regulatórias: NR-1 (Portaria MTE 1.419/2024), Portaria MTE 765/2025, Guia FRPRT MTE 2025, LGPD (Lei 13.709/2018)*
*Referência científica do instrumento: Gonçalves JS et al. Rev Saúde Pública 2021;55:69. DOI: 10.11606/s1518-8787.2021055003123*
*Licença do instrumento: Creative Commons CC BY-NC-ND 4.0*

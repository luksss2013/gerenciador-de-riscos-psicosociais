# Product

## Register

product

## Users

Profissionais de Segurança e Saúde do Trabalho (SST) no Brasil: técnicos de RH,
engenheiros de segurança, médicos do trabalho, gestores de empresas. Usam a
ferramenta para cumprir a NR-1 (nova redação, em vigor desde maio/2025) que
exige o gerenciamento de riscos psicossociais. Contexto de uso: escritório
corporativo, laptop, 6-8h de expediente, consultorias a 2-3 empresas em
paralelo. Não estão no browser por lazer — estão produzindo inventário de
riscos, plano de ação 5W2H, relatório PGR. Alta fricção regulatória: o
output precisa resistir a auditoria do Ministério do Trabalho e da
Fiscalização.

## Product Purpose

Plataforma SaaS multi-tenant que operacionaliza a gestão de riscos
psicossociais exigida pela NR-1. Pipeline: emite tokens anônimos para
trabalhadores → 40 itens Likert do COPSOQ II-BR → scoring por
departamento (k≥5, RB-10) → inventário de riscos (P×S) → plano de ação
5W2H → relatório PGR imprimível. Tudo passa por governança multi-tenant
no app tier (sem RLS no Postgres) e o portal do trabalhador coleta zero
PII. Sucesso = profissional entrega o relatório PGR no prazo com
evidência estatística válida por departamento.

## Brand Personality

Sóbrio · Técnico · Confiável. Não é SaaS de consumidor, não é landing page
de marketing. É a ferramenta que o auditor do MTE aceita. Tipografia
editorial, informação densa quando necessário, espaçamento generoso entre
blocos, paleta terrosa (pine, terracota, stone) que remete a papel
impresso/manual — não roxo-cyan-de-gradient. Toda decisão visual precisa
sobreviver a pergunta: "isso pareceria sério num parecer técnico?".

## Anti-references

SaaS genérico AI-slop: purple-to-blue gradients, glassmorphism, Inter
em todo lugar, cards dentro de cards, hero-metric template (número
gigante + 3 stats de suporte), cream/beige warm-neutral page bg, Inter
+ Geist + Space Grotesk, eyebrow chip "INTRODUCING" antes de cada
h1, numbered 01/02/03 markers em cada seção, bounce easing, em-dash
overuse, marketing buzzword ("supercharge your workflow", "empower
teams"), gradient text em heading, dark mode com neon glow. Toda saída
visual que carrega esses tells é falha de slop.

Anti-referência cultural: ferramenta de contabilidade/ERP legada
(SAP/Oracle) com density 2005 e form-field cinza. Já estamos fora desse
regime — target é o oposto calibrado.

## Design Principles

1. **Pratique o que prega.** A ferramenta serve SST — não pode causar
   fadiga visual, ansiedade ou ruído cognitivo. Quietude visual é
   feature regulatória.
2. **Densidade honesta.** Onde há dados (resultados, inventário, plano
   5W2H) a tabela respira mas cabe a informação; onde há narrativa
   (relatório PGR), respira como página de manual técnico.
3. **Evidência > decoração.** Cada elemento visual tem que carregar
   peso: KPI explica o que ele é, gráfico explica o que ele mostra,
   cor é codificada (risco alto/medio/baixo) — não decorativa.
4. **Multi-tenant invisível.** O profissional não vê o que é de outro
   tenant. UI parece single-user mas por baixo é isolado por
   `professionalId` em todo read/write.
5. **Portal anônimo é outro mundo.** Worker portal não compartilha chrome
   com o app. Sem sidebar, sem brand color, sem tracking. Só o questionário.

## Accessibility & Inclusion

WCAG 2.1 AA mínimo. Body text 4.5:1, large text 3:1, UI components 3:1.
Skip-link para conteúdo principal, focus visível em todo interativo,
navegação completa por teclado, `prefers-reduced-motion` respeitado
em todas as animações, hierarquia de heading sem skip, labels
associados a inputs, erros anunciados por aria-live quando aplicável.
Worker portal: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`,
zero PII, fonte generosa (16px+), touch targets 44px+.

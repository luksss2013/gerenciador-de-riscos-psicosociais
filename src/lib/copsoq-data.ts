// COPSOQ II-BR — Canonical instrument seed data.
// Source: Gonçalves JS, Moriguchi CS, Chaves TC, Sato TO. Rev Saúde Pública. 2021;55:69.
// DOI: 10.11606/s1518-8787.2021055003123
// License: CC BY-NC-ND 4.0 — redação dos 40 itens é imutável (RB-05).
//
// 11 dimensões, 40 itens, escala Likert 5 pontos.
// Direção: DIRECT = alto=ruim; INVERTED = alto=bom (scoring inverte para 100 - raw).

export type DimensionCode =
  | "D1" | "D2" | "D3" | "D4" | "D5" | "D6"
  | "D7" | "D8" | "D9" | "D10" | "D11";

export type Direction = "DIRECT" | "INVERTED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface CopsoqDimensionSeed {
  code: DimensionCode;
  namePtBr: string;
  groupName: string;
  itemCount: number;
  direction: Direction;
  descriptionPtBr: string;
  mteFactorsCovered: string[]; // F1..F13
}

export interface CopsoqItemSeed {
  index: number; // 1..40
  dimensionCode: DimensionCode;
  textPtBr: string;
  responseType: "frequency" | "degree" | "agreement";
  orderInDimension: number;
}

export const LIKERT_SCALE: { value: number; label: string }[] = [
  { value: 1, label: "Nunca / quase nunca" },
  { value: 2, label: "Raramente" },
  { value: 3, label: "Às vezes" },
  { value: 4, label: "Frequentemente" },
  { value: 5, label: "Sempre / quase sempre" },
];

// ─── 11 Dimensões (spec §1.3) ────────────────────────────────────────────────

export const COPSOQ_DIMENSIONS: CopsoqDimensionSeed[] = [
  {
    code: "D1",
    namePtBr: "Demandas no trabalho",
    groupName: "Organização do trabalho",
    itemCount: 5,
    direction: "DIRECT",
    descriptionPtBr:
      "Refere-se a exigências cognitivas, emocionais e quantitativas impostas pelo trabalho.",
    mteFactorsCovered: ["F1"],
  },
  {
    code: "D2",
    namePtBr: "Influência e desenvolvimento",
    groupName: "Organização do trabalho",
    itemCount: 5,
    direction: "INVERTED",
    descriptionPtBr:
      "Grau de autonomia, influência nas decisões e oportunidades de desenvolvimento de habilidades.",
    mteFactorsCovered: ["F2"],
  },
  {
    code: "D3",
    namePtBr: "Significado e comprometimento",
    groupName: "Organização do trabalho",
    itemCount: 4,
    direction: "INVERTED",
    descriptionPtBr:
      "Sentido do trabalho, clareza de objetivos e sentimento de contribuição para objetivos maiores.",
    mteFactorsCovered: ["F4"],
  },
  {
    code: "D4",
    namePtBr: "Valores no local de trabalho",
    groupName: "Relações sociais e liderança",
    itemCount: 5,
    direction: "INVERTED",
    descriptionPtBr:
      "Percepção de justiça, confiança mútua e transparência nos valores organizacionais.",
    mteFactorsCovered: ["F5", "F7"],
  },
  {
    code: "D5",
    namePtBr: "Liderança",
    groupName: "Relações sociais e liderança",
    itemCount: 4,
    direction: "INVERTED",
    descriptionPtBr:
      "Qualidade da supervisão, suporte do gestor direto e feedback sobre o desempenho.",
    mteFactorsCovered: ["F5"],
  },
  {
    code: "D6",
    namePtBr: "Relações interpessoais",
    groupName: "Relações sociais e liderança",
    itemCount: 4,
    direction: "INVERTED",
    descriptionPtBr:
      "Apoio social de colegas e superiores, clima colaborativo e qualidade das interações.",
    mteFactorsCovered: ["F6"],
  },
  {
    code: "D7",
    namePtBr: "Saúde geral",
    groupName: "Saúde e bem-estar",
    itemCount: 4,
    direction: "INVERTED",
    descriptionPtBr:
      "Percepção subjetiva de saúde física e mental global nos últimos 12 meses.",
    mteFactorsCovered: [],
  },
  {
    code: "D8",
    namePtBr: "Burnout e estresse",
    groupName: "Saúde e bem-estar",
    itemCount: 4,
    direction: "DIRECT",
    descriptionPtBr:
      "Exaustão emocional e física associada ao trabalho prolongado sem recuperação adequada.",
    mteFactorsCovered: ["F1", "F8"],
  },
  {
    code: "D9",
    namePtBr: "Conflito trabalho-família",
    groupName: "Equilíbrio vida-trabalho",
    itemCount: 2,
    direction: "DIRECT",
    descriptionPtBr:
      "Incompatibilidade percebida entre demandas profissionais e responsabilidades familiares.",
    mteFactorsCovered: ["F12"],
  },
  {
    code: "D10",
    namePtBr: "Satisfação no trabalho",
    groupName: "Recompensa e reconhecimento",
    itemCount: 2,
    direction: "INVERTED",
    descriptionPtBr:
      "Satisfação geral com diferentes aspectos do trabalho e reconhecimento recebido.",
    mteFactorsCovered: ["F8", "F9"],
  },
  {
    code: "D11",
    namePtBr: "Comportamentos ofensivos",
    groupName: "Relações sociais e liderança",
    itemCount: 1,
    direction: "DIRECT",
    descriptionPtBr:
      "Exposição a assédio moral, sexual ou outras formas de violência no trabalho.",
    mteFactorsCovered: ["F7"],
  },
];

// ─── 40 itens (spec §1.3 — imutável, RB-05) ──────────────────────────────────
// Textos em PT-BR alinhados ao instrumento canônico. Redação preservada.

export const COPSOQ_ITEMS: CopsoqItemSeed[] = [
  // D1 — Demandas (5)
  { index: 1, dimensionCode: "D1", responseType: "frequency", orderInDimension: 1,
    textPtBr: "O seu trabalho exige que você trabalhe muito rápido?" },
  { index: 2, dimensionCode: "D1", responseType: "frequency", orderInDimension: 2,
    textPtBr: "O seu trabalho exige que você trabalhe muito intensamente?" },
  { index: 3, dimensionCode: "D1", responseType: "degree", orderInDimension: 3,
    textPtBr: "Você tem que fazer o seu trabalho de forma repetitiva?" },
  { index: 4, dimensionCode: "D1", responseType: "frequency", orderInDimension: 4,
    textPtBr: "O seu trabalho exige alto nível de atenção e concentração?" },
  { index: 5, dimensionCode: "D1", responseType: "frequency", orderInDimension: 5,
    textPtBr: "O seu trabalho exige que você tome decisões difíceis?" },

  // D2 — Influência e desenvolvimento (5, INVERTED)
  { index: 6, dimensionCode: "D2", responseType: "degree", orderInDimension: 1,
    textPtBr: "Você tem influência sobre a quantidade de trabalho que lhe é atribuída?" },
  { index: 7, dimensionCode: "D2", responseType: "degree", orderInDimension: 2,
    textPtBr: "Você tem influência sobre o ritmo do seu trabalho?" },
  { index: 8, dimensionCode: "D2", responseType: "degree", orderInDimension: 3,
    textPtBr: "Você tem oportunidade de aprender coisas novas no trabalho?" },
  { index: 9, dimensionCode: "D2", responseType: "degree", orderInDimension: 4,
    textPtBr: "O seu trabalho exige que você tenha iniciativa?" },
  { index: 10, dimensionCode: "D2", responseType: "degree", orderInDimension: 5,
    textPtBr: "Você tem possibilidade de desenvolver suas habilidades no trabalho?" },

  // D3 — Significado e comprometimento (4, INVERTED)
  { index: 11, dimensionCode: "D3", responseType: "degree", orderInDimension: 1,
    textPtBr: "Você sente que o trabalho que faz é importante?" },
  { index: 12, dimensionCode: "D3", responseType: "frequency", orderInDimension: 2,
    textPtBr: "Você tem clareza sobre os objetivos do seu trabalho?" },
  { index: 13, dimensionCode: "D3", responseType: "frequency", orderInDimension: 3,
    textPtBr: "Você sente que contribui para alcançar os objetivos da organização?" },
  { index: 14, dimensionCode: "D3", responseType: "degree", orderInDimension: 4,
    textPtBr: "Você se sente comprometido(a) com o trabalho que realiza?" },

  // D4 — Valores no local de trabalho (5, INVERTED)
  { index: 15, dimensionCode: "D4", responseType: "frequency", orderInDimension: 1,
    textPtBr: "As decisões no seu local de trabalho são tomadas de forma justa?" },
  { index: 16, dimensionCode: "D4", responseType: "degree", orderInDimension: 2,
    textPtBr: "Você confia na liderança da sua empresa?" },
  { index: 17, dimensionCode: "D4", responseType: "frequency", orderInDimension: 3,
    textPtBr: "Os valores da organização são comunicados de forma transparente?" },
  { index: 18, dimensionCode: "D4", responseType: "degree", orderInDimension: 4,
    textPtBr: "Você sente que é tratado(a) com respeito no trabalho?" },
  { index: 19, dimensionCode: "D4", responseType: "frequency", orderInDimension: 5,
    textPtBr: "Existe confiança mútua entre colegas e gestores no seu setor?" },

  // D5 — Liderança (4, INVERTED)
  { index: 20, dimensionCode: "D5", responseType: "frequency", orderInDimension: 1,
    textPtBr: "O seu gestor direto oferece suporte quando enfrenta dificuldades no trabalho?" },
  { index: 21, dimensionCode: "D5", responseType: "frequency", orderInDimension: 2,
    textPtBr: "O seu gestor direto reconhece o seu bom desempenho?" },
  { index: 22, dimensionCode: "D5", responseType: "frequency", orderInDimension: 3,
    textPtBr: "O seu gestor direto fornece feedback sobre o seu trabalho?" },
  { index: 23, dimensionCode: "D5", responseType: "degree", orderInDimension: 4,
    textPtBr: "O seu gestor direto planeja o trabalho de forma organizada?" },

  // D6 — Relações interpessoais (4, INVERTED)
  { index: 24, dimensionCode: "D6", responseType: "degree", orderInDimension: 1,
    textPtBr: "Há um bom clima de colaboração entre você e seus colegas?" },
  { index: 25, dimensionCode: "D6", responseType: "frequency", orderInDimension: 2,
    textPtBr: "Você recebe apoio de seus colegas quando precisa?" },
  { index: 26, dimensionCode: "D6", responseType: "frequency", orderInDimension: 3,
    textPtBr: "Você recebe apoio de seus superiores quando precisa?" },
  { index: 27, dimensionCode: "D6", responseType: "degree", orderInDimension: 4,
    textPtBr: "As pessoas no seu local de trabalho se ajudam mutuamente?" },

  // D7 — Saúde geral (4, INVERTED)
  { index: 28, dimensionCode: "D7", responseType: "frequency", orderInDimension: 1,
    textPtBr: "De modo geral, você diria que a sua saúde é boa?" },
  { index: 29, dimensionCode: "D7", responseType: "frequency", orderInDimension: 2,
    textPtBr: "Você tem sentido bem-estar físico nos últimos 12 meses?" },
  { index: 30, dimensionCode: "D7", responseType: "frequency", orderInDimension: 3,
    textPtBr: "Você tem sentido bem-estar mental/emocional nos últimos 12 meses?" },
  { index: 31, dimensionCode: "D7", responseType: "frequency", orderInDimension: 4,
    textPtBr: "Você tem conseguido recuperar energia entre os turnos de trabalho?" },

  // D8 — Burnout e estresse (4, DIRECT)
  { index: 32, dimensionCode: "D8", responseType: "frequency", orderInDimension: 1,
    textPtBr: "Você se sentido esgotado(a) emocionalmente pelo trabalho?" },
  { index: 33, dimensionCode: "D8", responseType: "frequency", orderInDimension: 2,
    textPtBr: "Você se sentido fisicamente exausto(a) ao final do expediente?" },
  { index: 34, dimensionCode: "D8", responseType: "frequency", orderInDimension: 3,
    textPtBr: "Você tem pensado em desistir do trabalho devido ao cansaço?" },
  { index: 35, dimensionCode: "D8", responseType: "frequency", orderInDimension: 4,
    textPtBr: "Você tem sentido que não consegue dar conta das demandas do trabalho?" },

  // D9 — Conflito trabalho-família (2, DIRECT)
  { index: 36, dimensionCode: "D9", responseType: "frequency", orderInDimension: 1,
    textPtBr: "As exigências do seu trabalho interferem na sua vida familiar ou pessoal?" },
  { index: 37, dimensionCode: "D9", responseType: "frequency", orderInDimension: 2,
    textPtBr: "Você precisa adiar ou cancelar compromissos familiares por causa do trabalho?" },

  // D10 — Satisfação no trabalho (2, INVERTED)
  { index: 38, dimensionCode: "D10", responseType: "degree", orderInDimension: 1,
    textPtBr: "De modo geral, você está satisfeito(a) com o seu trabalho?" },
  { index: 39, dimensionCode: "D10", responseType: "degree", orderInDimension: 2,
    textPtBr: "Você está satisfeito(a) com as perspectivas de carreira na sua empresa?" },

  // D11 — Comportamentos ofensivos (1, DIRECT)
  { index: 40, dimensionCode: "D11", responseType: "frequency", orderInDimension: 1,
    textPtBr: "Nos últimos 12 meses, você foi exposto(a) a comportamentos ofensivos, assédio ou violência no trabalho?" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getItemsForDimension(code: DimensionCode): CopsoqItemSeed[] {
  return COPSOQ_ITEMS.filter((i) => i.dimensionCode === code).sort(
    (a, b) => a.orderInDimension - b.orderInDimension
  );
}

export function getDimension(code: DimensionCode): CopsoqDimensionSeed {
  const d = COPSOQ_DIMENSIONS.find((x) => x.code === code);
  if (!d) throw new Error(`Unknown dimension: ${code}`);
  return d;
}

// ─── 13 Fatores FRPRT do MTE (spec §1.2) ─────────────────────────────────────

export interface MteFactor {
  code: string; // F1..F13
  name: string;
  category: string;
  coveredByCopsoq: boolean;
  coveredDimensions: DimensionCode[];
}

export const MTE_FACTORS: MteFactor[] = [
  { code: "F1", name: "Sobrecarga e ritmo de trabalho", category: "Organização do trabalho",
    coveredByCopsoq: true, coveredDimensions: ["D1", "D8"] },
  { code: "F2", name: "Baixa autonomia/controle", category: "Organização do trabalho",
    coveredByCopsoq: true, coveredDimensions: ["D2"] },
  { code: "F3", name: "Jornadas prolongadas ou atípicas", category: "Organização do trabalho",
    coveredByCopsoq: false, coveredDimensions: [] },
  { code: "F4", name: "Trabalho monótono ou baixo conteúdo", category: "Organização do trabalho",
    coveredByCopsoq: true, coveredDimensions: ["D3"] },
  { code: "F5", name: "Má qualidade da liderança", category: "Relações sociais e liderança",
    coveredByCopsoq: true, coveredDimensions: ["D5"] },
  { code: "F6", name: "Falta de apoio social", category: "Relações sociais e liderança",
    coveredByCopsoq: true, coveredDimensions: ["D6"] },
  { code: "F7", name: "Assédio moral/sexual/violência", category: "Relações sociais e liderança",
    coveredByCopsoq: true, coveredDimensions: ["D4", "D11"] },
  { code: "F8", name: "Desequilíbrio esforço-recompensa", category: "Recompensa e reconhecimento",
    coveredByCopsoq: true, coveredDimensions: ["D8", "D10"] },
  { code: "F9", name: "Insegurança no emprego", category: "Recompensa e reconhecimento",
    coveredByCopsoq: false, coveredDimensions: [] },
  { code: "F10", name: "Comunicação organizacional deficiente", category: "Comunicação e mudança",
    coveredByCopsoq: false, coveredDimensions: [] },
  { code: "F11", name: "Gestão de mudanças inadequada", category: "Comunicação e mudança",
    coveredByCopsoq: false, coveredDimensions: [] },
  { code: "F12", name: "Conflito trabalho-família", category: "Outros",
    coveredByCopsoq: true, coveredDimensions: ["D9"] },
  { code: "F13", name: "Exposição a eventos traumáticos", category: "Outros",
    coveredByCopsoq: false, coveredDimensions: [] },
];

// ─── Templates de pré-preenchimento do inventário por dimensão (spec §4.10) ─

export const INVENTORY_TEMPLATES: Record<
  DimensionCode,
  { hazardDescription: string; possibleHarms: string; mteFactorCode: string }
> = {
  D1: {
    mteFactorCode: "F1",
    hazardDescription:
      "Sobrecarga e ritmo de trabalho elevados — demandas quantitativas e cognitivas acima do sustentável.",
    possibleHarms:
      "Fadiga crônica, estresse ocupacional, erros por cansaço, diminuição da capacidade de concentração.",
  },
  D2: {
    mteFactorCode: "F2",
    hazardDescription:
      "Baixa autonomia e controle sobre o próprio trabalho — ritmo e conteúdo determinados externamente.",
    possibleHarms:
      "Desmotivação, sensação de impotência, redução do engajamento, sobrecarga mental passiva.",
  },
  D3: {
    mteFactorCode: "F4",
    hazardDescription:
      "Trabalho com baixo significado ou conteúdo monótono — falta de clareza sobre o propósito.",
    possibleHarms:
      "Desengajamento, tédio crônico, perda de sentido ocupacional, queda de produtividade.",
  },
  D4: {
    mteFactorCode: "F5",
    hazardDescription:
      "Valores organizacionais percebidos como injustos — clima de baixa confiança e respeito.",
    possibleHarms:
      "Insatisfação crônica, conflitos interpessoais, queda de comprometimento, rotatividade elevada.",
  },
  D5: {
    mteFactorCode: "F5",
    hazardDescription:
      "Liderança de baixa qualidade — falta de suporte, reconhecimento e feedback do gestor direto.",
    possibleHarms:
      "Falta de direção, desalinhamento de objetivos, frustração profissional, evasão de talentos.",
  },
  D6: {
    mteFactorCode: "F6",
    hazardDescription:
      "Falta de apoio social no ambiente de trabalho — clima interpessoal pouco colaborativo.",
    possibleHarms:
      "Isolamento, dificuldade de pedir ajuda, conflitos não resolvidos, piora do clima organizacional.",
  },
  D7: {
    mteFactorCode: "F1",
    hazardDescription:
      "Impacto do trabalho na saúde geral percebida — sintomas físicos e mentais associados ao labor.",
    possibleHarms:
      "Quadros de adoecimento físico e mental, absenteísmo, presenteísmo, queda de desempenho.",
  },
  D8: {
    mteFactorCode: "F1",
    hazardDescription:
      "Sinais de burnout e exaustão ocupacional — desgaste emocional e físico sem recuperação adequada.",
    possibleHarms:
      "Burnout, adoecimento mental, afastamentos prolongados, perda de capacidade laboral.",
  },
  D9: {
    mteFactorCode: "F12",
    hazardDescription:
      "Conflito trabalho-família — demandas do trabalho invadindo tempo e responsabilidades pessoais.",
    possibleHarms:
      "Estresse doméstico, conflitos familiares, queda de bem-estar, insatisfação com a vida.",
  },
  D10: {
    mteFactorCode: "F8",
    hazardDescription:
      "Insatisfação com o trabalho e com perspectivas de carreira — desequilíbrio esforço-recompensa.",
    possibleHarms:
      "Desmotivação, rotatividade, queda de produtividade, perda de talentos-chave.",
  },
  D11: {
    mteFactorCode: "F7",
    hazardDescription:
      "Exposição a comportamentos ofensivos, assédio moral ou violência no trabalho.",
    possibleHarms:
      "Trauma psicológico, adoecimento mental grave, ações trabalhistas, danos à reputação da empresa.",
  },
};

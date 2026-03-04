export interface InstructionData {
  whatToCheck: string;
  frequency: string;
  methodology: string;
  criteria: {
    bom: string;
    regular: string;
    ruim: string;
  };
}

export const INSTRUCTIONS: Record<string, InstructionData> = {
  populacao_plantio: {
    whatToCheck: "Aderência à ficha de correção de população",
    frequency: "Uma vez por safra",
    methodology: "Verificar a aderência à ficha de correção por meio de cinco contagens aleatórias de cinco metros em fêmeas, primeiro e segundo macho.",
    criteria: {
      bom: "Variação de até 5% — 10 pts",
      regular: "Variação de 5,1 a 7,5% — 5 pts",
      ruim: "Variação maior que 7,5% — 0 pts",
    },
  },
  desenvolvimento_inicial: {
    whatToCheck: "Aspectos técnicos iniciais — Preparo do solo / Qualidade de Plantio / Uniformidade inicial",
    frequency: "Uma vez por safra",
    methodology: "Avaliação visual da área considerando: ausência de torrões e plantas daninhas / plantio em boa profundidade e distribuição (CV ≤5%) / emergência uniforme.",
    criteria: {
      bom: "Atendeu todos os itens — 7 pts",
      regular: "Atendeu parcialmente — 3,5 pts",
      ruim: "Não atendeu nenhum item — 0 pts",
    },
  },
  sentido_plantio: {
    whatToCheck: "Verificar se o plantio está no sentido Leste-Oeste",
    frequency: "Uma vez por safra",
    methodology: "Verificar na bússola.",
    criteria: {
      bom: "Atendeu — 3 pts",
      regular: "N/A — 0 pts",
      ruim: "Não atendeu — 0 pts",
    },
  },
  pragas_veg: {
    whatToCheck: "Controle de pragas de solo, percevejos, cigarrinha, lagartas e pulgões",
    frequency: "Todas as visitas durante o estágio vegetativo",
    methodology: "Usar escalas de avaliação de percevejo e lagartas. Para cigarrinha: <1 inseto/planta = Bom | 1-2 = Regular | >2 = Ruim.\n\nPercevejos: nota 0-1 = Bom | nota 2 = Regular | nota 3-4 = Ruim\nLagartas: nota 0-3 = Bom | nota 4-5 = Regular | nota 6-9 = Ruim",
    criteria: {
      bom: "Controle adequado em todos os critérios — 10 pts",
      regular: "Controle parcial — 5 pts",
      ruim: "Sem controle adequado — 0 pts",
    },
  },
  doencas_veg: {
    whatToCheck: "Controle de doenças em geral",
    frequency: "Todas as visitas durante o estágio vegetativo",
    methodology: "Usar Escala Diagramática para estimar área foliar afetada. Avaliar impacto por estágio — folhas do baixeiro com doença em V4 é preocupante, mas em VT tem menor importância pelo número de folhas que a planta possui nesta fase.",
    criteria: {
      bom: "0 a 6% da área foliar afetada — 7 pts",
      regular: "7 a 24% — 3,5 pts",
      ruim: "25% ou mais — 0 pts",
    },
  },
  daninhas_veg: {
    whatToCheck: "Controle de plantas daninhas em geral",
    frequency: "Todas as visitas durante o estágio vegetativo",
    methodology: "Usar imagens de referência (BOM/REGULAR/RUIM) como base de comparação visual.",
    criteria: {
      bom: "Lavoura limpa, sem plantas daninhas competindo — 5 pts",
      regular: "Presença moderada de plantas daninhas — 2,5 pts",
      ruim: "Lavoura dominada por plantas daninhas — 0 pts",
    },
  },
  folhas_espiga: {
    whatToCheck: "Número de folhas acima da espiga após o despendoamento",
    frequency: "Uma vez por safra",
    methodology: "Realizar avaliação em 3 contagens de 50 plantas cada. Verificar após o despendoamento masculino. Consultar Tecnologia de Produção para referência do híbrido.",
    criteria: {
      bom: "Número de folhas dentro do recomendado para o híbrido — 7 pts",
      regular: "Pequeno desvio em relação ao recomendado — 3,5 pts",
      ruim: "Desvio significativo do recomendado — 0 pts",
    },
  },
  pragas_flor: {
    whatToCheck: "Controle de lagartas, pulgões e percevejos",
    frequency: "Todas as visitas durante o florescimento",
    methodology: "Usar escalas de percevejo e lagartas. Para cigarrinha no florescimento: <3 insetos/planta = Bom | 3-5 = Regular | >5 = Ruim.",
    criteria: {
      bom: "Controle adequado — 5 pts",
      regular: "Controle parcial — 2,5 pts",
      ruim: "Sem controle — 0 pts",
    },
  },
  doencas_flor: {
    whatToCheck: "Controle de doenças em geral",
    frequency: "Todas as visitas durante o florescimento",
    methodology: "Usar Escala Diagramática.",
    criteria: {
      bom: "0 a 6% da área foliar afetada — 10 pts",
      regular: "7 a 24% — 5 pts",
      ruim: "25% ou mais — 0 pts",
    },
  },
  estimativa_campo: {
    whatToCheck: "Estimar a produtividade da área",
    frequency: "Uma vez por safra",
    methodology: "Avaliação visual da área comparando com expectativa do contrato.",
    criteria: {
      bom: "Variação de +/-10% em relação à estimativa — 10 pts",
      regular: "Variação de +/-25% — 5 pts",
      ruim: "Variação maior que 25% — 0 pts",
    },
  },
  doencas_ench: {
    whatToCheck: "Controle de doenças em geral",
    frequency: "Uma vez por safra",
    methodology: "Usar Escala Diagramática.",
    criteria: {
      bom: "0 a 6% da área foliar afetada — 10 pts",
      regular: "7 a 24% — 5 pts",
      ruim: "25% ou mais — 0 pts",
    },
  },
  pragas_pre: {
    whatToCheck: "Controle de percevejos e lagartas",
    frequency: "Uma vez por safra",
    methodology: "Usar escalas de percevejo e lagartas. Para cigarrinha: <3 insetos/planta = Bom | 3-5 = Regular | >5 = Ruim.",
    criteria: {
      bom: "Controle adequado — 1 pt",
      regular: "Controle parcial — 0,5 pts",
      ruim: "Sem controle — 0 pts",
    },
  },
  daninhas_pre: {
    whatToCheck: "Plantas daninhas em geral, especialmente as que prejudicam a colheita e/ou a qualidade do lote final",
    frequency: "Uma vez por safra",
    methodology: "Usar imagens de referência BOM/REGULAR/RUIM como base de comparação.",
    criteria: {
      bom: "Lavoura limpa — 5 pts",
      regular: "Presença moderada — 2,5 pts",
      ruim: "Lavoura dominada — 0 pts",
    },
  },
  populacao_final: {
    whatToCheck: "Aderência à recomendação da Tecnologia de Produção",
    frequency: "Uma vez por safra (realizar até R5.5)",
    methodology: "Realizar cinco contagens aleatórias de cinco metros em fêmeas, primeiro e segundo macho.",
    criteria: {
      bom: "Variação de até 5% — 10 pts",
      regular: "Variação de 5,1 a 7,5% — 5 pts",
      ruim: "Variação maior que 7,5% — 0 pts",
    },
  },
};

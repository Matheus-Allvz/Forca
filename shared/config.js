const REGRAS_DO_JOGO = {
  maxErrors: 6,
  turnTimeLimitMs: 20_000,
  reconnectGraceMs: 30_000,
  serverHeartbeatTimeoutMs: 15_000,
  failoverPollMs: 5_000
};

const PARTES_DA_FORCA = [
  "cabeca",
  "tronco",
  "braco-direito",
  "braco-esquerdo",
  "perna-direita",
  "perna-esquerda"
];

module.exports = {
  REGRAS_DO_JOGO,
  PARTES_DA_FORCA
};

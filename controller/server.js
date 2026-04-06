const express = require("express");
const cors = require("cors");
const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const crypto = require("crypto");
const { Server } = require("socket.io");
const { REGRAS_DO_JOGO } = require("../shared/config");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const porta = Number(process.env.PORT || process.env.CONTROLLER_PORT || 3000);
const urlBasePublica = process.env.PUBLIC_BASE_URL || `http://localhost:${porta}`;
const caminhoRanking = process.env.RANKING_FILE || path.resolve(__dirname, "./data/ranking.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../web-client/public")));

const servidoresRegistrados = new Map();
const sessoes = new Map();
const partidas = new Map();
const filaDeEspera = [];
const temporizadoresDesconexaoLobby = new Map();
const partidasMigrando = new Set();
const rankingJogadores = carregarRanking();
const eventosRecentes = [];
const limiteEventos = 100;

function gerarId(prefixo) {
  return `${prefixo}-${crypto.randomUUID()}`;
}

function agoraIso() {
  return new Date().toISOString();
}

function registrarEvento(tipo, mensagem, detalhes = {}) {
  eventosRecentes.unshift({
    id: gerarId("event"),
    type: tipo,
    message: mensagem,
    details: detalhes,
    createdAt: Date.now(),
    createdAtIso: agoraIso()
  });

  if (eventosRecentes.length > limiteEventos) {
    eventosRecentes.length = limiteEventos;
  }
}

function garantirDiretorioArquivo(caminhoArquivo) {
  fs.mkdirSync(path.dirname(caminhoArquivo), { recursive: true });
}

function normalizarNomeRanking(nome) {
  return String(nome || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 24);
}

function normalizarNomeJogador(nome) {
  return normalizarNomeRanking(nome);
}

function carregarRanking() {
  try {
    garantirDiretorioArquivo(caminhoRanking);
    if (!fs.existsSync(caminhoRanking)) {
      return new Map();
    }

    const conteudo = fs.readFileSync(caminhoRanking, "utf8");
    const itens = JSON.parse(conteudo || "[]");
    return new Map(itens.map((item) => [item.id, item]));
  } catch (error) {
    console.error("ranking load failed", error.message);
    return new Map();
  }
}

function salvarRanking() {
  try {
    garantirDiretorioArquivo(caminhoRanking);
    fs.writeFileSync(caminhoRanking, JSON.stringify([...rankingJogadores.values()], null, 2), "utf8");
  } catch (error) {
    console.error("ranking save failed", error.message);
  }
}

function obterEntradaRanking(nomeJogador) {
  const rankingId = normalizarNomeRanking(nomeJogador);
  if (!rankingId) {
    return null;
  }

  const existente = rankingJogadores.get(rankingId);
  if (existente) {
    return existente;
  }

  const agora = agoraIso();
  const criado = {
    id: rankingId,
    playerName: String(nomeJogador || "Jogador").trim().slice(0, 24) || "Jogador",
    wins: 0,
    losses: 0,
    games: 0,
    winRate: 0,
    lastPlayedAt: null,
    createdAt: agora,
    updatedAt: agora
  };
  rankingJogadores.set(rankingId, criado);
  return criado;
}

function atualizarEstatisticasRanking(entrada) {
  entrada.games = Number(entrada.wins || 0) + Number(entrada.losses || 0);
  entrada.winRate = entrada.games > 0
    ? Number(((entrada.wins / entrada.games) * 100).toFixed(1))
    : 0;
  entrada.updatedAt = agoraIso();
}

function registrarJogadorNoRanking(nomeJogador) {
  const entrada = obterEntradaRanking(nomeJogador);
  if (!entrada) {
    return;
  }

  entrada.playerName = String(nomeJogador || entrada.playerName).trim().slice(0, 24) || entrada.playerName;
  atualizarEstatisticasRanking(entrada);
  salvarRanking();
}

function registrarResultadoNoRanking(nomeJogador, tipoResultado) {
  const entrada = obterEntradaRanking(nomeJogador);
  if (!entrada) {
    return;
  }

  entrada.playerName = String(nomeJogador || entrada.playerName).trim().slice(0, 24) || entrada.playerName;
  if (tipoResultado === "win") {
    entrada.wins += 1;
  }
  if (tipoResultado === "loss") {
    entrada.losses += 1;
  }
  entrada.lastPlayedAt = agoraIso();
  atualizarEstatisticasRanking(entrada);
  salvarRanking();
}

function obterRankingOrdenado() {
  return [...rankingJogadores.values()]
    .map((entrada) => ({
      ...entrada,
      games: Number(entrada.games || 0),
      wins: Number(entrada.wins || 0),
      losses: Number(entrada.losses || 0),
      winRate: Number(entrada.winRate || 0)
    }))
    .sort((a, b) => (
      b.wins - a.wins ||
      b.winRate - a.winRate ||
      b.games - a.games ||
      String(b.lastPlayedAt || "").localeCompare(String(a.lastPlayedAt || "")) ||
      a.playerName.localeCompare(b.playerName)
    ));
}

function obterHostnameRequisicao(origem) {
  const hostBruto = origem?.headers?.["x-forwarded-host"] || origem?.headers?.host || origem?.get?.("x-forwarded-host") || origem?.get?.("host") || "localhost";
  return String(hostBruto).split(":")[0];
}

function obterProtocoloRequisicao(origem) {
  const protocoloBruto = origem?.headers?.["x-forwarded-proto"] || origem?.protocol || origem?.handshake?.headers?.["x-forwarded-proto"] || "http";
  return String(protocoloBruto).split(",")[0].trim() || "http";
}

function montarUrlPublicaServidor(hostname, portaServidor) {
  return `http://${hostname}:${portaServidor}`;
}

function obterUrlPublicaServidor(entradaServidor, origem) {
  if (entradaServidor?.publicUrl) {
    return entradaServidor.publicUrl;
  }

  const hostname = obterHostnameRequisicao(origem);
  const protocolo = obterProtocoloRequisicao(origem);
  return `${protocolo}://${hostname}:${entradaServidor.publicPort}`;
}

function servidorEstaSaudavel(idServidor) {
  const entrada = servidoresRegistrados.get(idServidor);
  return Boolean(entrada && entrada.lastHeartbeat >= Date.now() - REGRAS_DO_JOGO.serverHeartbeatTimeoutMs);
}

function obterServidoresSaudaveis(idServidorExcluido = null) {
  const limite = Date.now() - REGRAS_DO_JOGO.serverHeartbeatTimeoutMs;
  return [...servidoresRegistrados.values()]
    .filter((entry) => entry.lastHeartbeat >= limite && entry.serverId !== idServidorExcluido)
    .sort((a, b) => a.activeGames - b.activeGames || a.serverId.localeCompare(b.serverId));
}

function obterInstantaneoFila() {
  return filaDeEspera.map((entry, index) => ({
    playerId: entry.playerId,
    playerName: entry.playerName,
    position: index + 1
  }));
}

function sincronizarCargaServidores() {
  for (const entrada of servidoresRegistrados.values()) {
    entrada.activeGames = [...partidas.values()].filter((partida) => (
      partida &&
      partida.serverId === entrada.serverId &&
      partida.status !== "finished"
    )).length;
  }
}

function emitirAtualizacoesFila() {
  const snapshot = obterInstantaneoFila();
  io.emit("queue-public-update", {
    waitingCount: snapshot.length
  });

  for (const entry of filaDeEspera) {
    const socket = io.sockets.sockets.get(entry.socketId);
    if (!socket) {
      continue;
    }

    const self = snapshot.find((item) => item.playerId === entry.playerId);
    socket.emit("queue-update", {
      position: self ? self.position : null,
      waitingCount: snapshot.length,
      snapshot
    });
  }
}

function enfileirarJogador(sessao) {
  const entradaExistente = filaDeEspera.find((entry) => entry.playerId === sessao.playerId);
  if (entradaExistente) {
    entradaExistente.playerName = sessao.playerName;
    entradaExistente.socketId = sessao.controllerSocketId;
    emitirAtualizacoesFila();
    return;
  }

  filaDeEspera.push({
    playerId: sessao.playerId,
    playerName: sessao.playerName,
    socketId: sessao.controllerSocketId,
    joinedAt: Date.now()
  });
  sessao.status = "waiting";
  sessao.queueJoinedAt = Date.now();
  registrarEvento("queue", `${sessao.playerName} entrou na fila.`, {
    playerId: sessao.playerId,
    playerName: sessao.playerName
  });
  emitirAtualizacoesFila();
}

function removerDaFila(playerId) {
  const index = filaDeEspera.findIndex((entry) => entry.playerId === playerId);
  if (index >= 0) {
    registrarEvento("queue", `${filaDeEspera[index].playerName} saiu da fila.`, {
      playerId: filaDeEspera[index].playerId,
      playerName: filaDeEspera[index].playerName
    });
    filaDeEspera.splice(index, 1);
    emitirAtualizacoesFila();
  }
}

function limparTemporizadorLobby(playerId) {
  clearTimeout(temporizadoresDesconexaoLobby.get(playerId));
  temporizadoresDesconexaoLobby.delete(playerId);
}

function removerSessao(sessao, motivo = "session-removed") {
  if (!sessao) {
    return;
  }

  removerDaFila(sessao.playerId);
  limparTemporizadorLobby(sessao.playerId);
  sessoes.delete(sessao.playerId);
  registrarEvento("session", `Sessao removida para ${sessao.playerName}.`, {
    playerId: sessao.playerId,
    playerName: sessao.playerName,
    reason: motivo
  });
}

function localizarSessaoPorNome(nomeJogador, playerIdIgnorado = null) {
  const nomeNormalizado = normalizarNomeJogador(nomeJogador);
  if (!nomeNormalizado) {
    return null;
  }

  for (const sessao of sessoes.values()) {
    if (sessao.playerId === playerIdIgnorado) {
      continue;
    }

    if (normalizarNomeJogador(sessao.playerName) === nomeNormalizado) {
      return sessao;
    }
  }

  return null;
}

function validarNomeDisponivel(nomeJogador, playerIdIgnorado = null) {
  const sessaoConflitante = localizarSessaoPorNome(nomeJogador, playerIdIgnorado);
  if (!sessaoConflitante) {
    return { disponivel: true };
  }

  const sessaoEncerrada = ["finished", "winner"].includes(sessaoConflitante.status);
  if (sessaoEncerrada) {
    removerSessao(sessaoConflitante, "finished-session-name-released");
    return { disponivel: true };
  }

  return {
    disponivel: false,
    sessaoConflitante
  };
}

function encerrarSessaoDeFila(sessao, motivo = "queue-left") {
  if (!sessao) {
    return;
  }

  removerDaFila(sessao.playerId);
  limparTemporizadorLobby(sessao.playerId);
  sessoes.delete(sessao.playerId);
  registrarEvento("queue", `${sessao.playerName} saiu da fila voluntariamente.`, {
    playerId: sessao.playerId,
    playerName: sessao.playerName,
    reason: motivo
  });
}

async function criarPartidaNoServidor(entradaServidor, gameId, jogadores) {
  const response = await fetch(`${entradaServidor.internalUrl}/internal/create-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ gameId, players: jogadores })
  });

  if (!response.ok) {
    throw new Error(`Falha ao criar partida no servidor ${entradaServidor.serverId}`);
  }

  return response.json();
}

async function restaurarPartidaNoServidor(entradaServidor, snapshot) {
  const response = await fetch(`${entradaServidor.internalUrl}/internal/restore-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ snapshot })
  });

  if (!response.ok) {
    throw new Error(`Falha ao restaurar partida no servidor ${entradaServidor.serverId}`);
  }

  return response.json();
}

async function tentarParearJogadores() {
  while (filaDeEspera.length >= 2) {
    const servidoresSaudaveis = obterServidoresSaudaveis();
    if (servidoresSaudaveis.length === 0) {
      return;
    }

    const primeiro = filaDeEspera.shift();
    const segundo = filaDeEspera.shift();
    emitirAtualizacoesFila();

    const sessaoA = sessoes.get(primeiro.playerId);
    const sessaoB = sessoes.get(segundo.playerId);
    if (!sessaoA || !sessaoB) {
      continue;
    }

    const servidorSelecionado = servidoresSaudaveis[0];
    const gameId = gerarId("game");
    const jogadores = [sessaoA, sessaoB].map((sessao) => ({
      playerId: sessao.playerId,
      playerName: sessao.playerName,
      reconnectToken: sessao.reconnectToken
    }));

    try {
      await criarPartidaNoServidor(servidorSelecionado, gameId, jogadores);
      partidas.set(gameId, {
        gameId,
        serverId: servidorSelecionado.serverId,
        serverPort: servidorSelecionado.publicPort,
        playerIds: jogadores.map((item) => item.playerId),
        createdAt: Date.now(),
        status: "assigned",
        lastMigrationAt: null,
        snapshot: null
      });
      sincronizarCargaServidores();

      for (const sessao of [sessaoA, sessaoB]) {
        sessao.status = "assigned";
        sessao.gameId = gameId;
        sessao.serverId = servidorSelecionado.serverId;
        sessao.serverPort = servidorSelecionado.publicPort;
      }
      registrarEvento("match", `Partida ${gameId} criada em ${servidorSelecionado.serverId}.`, {
        gameId,
        serverId: servidorSelecionado.serverId,
        players: jogadores.map((jogador) => jogador.playerName)
      });

      io.to(sessaoA.controllerSocketId).emit("match-found", {
        gameId,
        playerId: sessaoA.playerId,
        reconnectToken: sessaoA.reconnectToken,
        serverUrl: obterUrlPublicaServidor(servidorSelecionado, io.sockets.sockets.get(sessaoA.controllerSocketId)?.handshake),
        serverId: servidorSelecionado.serverId,
        opponentName: sessaoB.playerName
      });
      io.to(sessaoB.controllerSocketId).emit("match-found", {
        gameId,
        playerId: sessaoB.playerId,
        reconnectToken: sessaoB.reconnectToken,
        serverUrl: obterUrlPublicaServidor(servidorSelecionado, io.sockets.sockets.get(sessaoB.controllerSocketId)?.handshake),
        serverId: servidorSelecionado.serverId,
        opponentName: sessaoA.playerName
      });
    } catch (error) {
      enfileirarJogador(sessaoA);
      enfileirarJogador(sessaoB);
      return;
    }
  }
}

async function migrarPartida(partida) {
  if (!partida || !partida.snapshot || partida.status === "finished" || partidasMigrando.has(partida.gameId)) {
    return false;
  }

  const servidorDestino = obterServidoresSaudaveis(partida.serverId)[0];
  if (!servidorDestino) {
    return false;
  }

  partidasMigrando.add(partida.gameId);
  try {
    const servidorOrigemId = partida.serverId;
    const snapshot = {
      ...partida.snapshot,
      status: partida.snapshot.status === "finished" ? "finished" : "waiting-players",
      players: (partida.snapshot.players || []).map((jogador) => ({
        ...jogador,
        connected: false,
        socketId: null,
        disconnectDeadline: null
      }))
    };

    partida.pendingServerId = servidorDestino.serverId;
    await restaurarPartidaNoServidor(servidorDestino, snapshot);

    partida.serverId = servidorDestino.serverId;
    partida.serverPort = servidorDestino.publicPort;
    partida.status = snapshot.status;
    partida.lastMigrationAt = Date.now();
    partida.snapshot = snapshot;
    partida.previousServerId = servidorOrigemId;
    delete partida.pendingServerId;
    sincronizarCargaServidores();
    registrarEvento("migration", `Partida ${partida.gameId} migrada de ${servidorOrigemId} para ${servidorDestino.serverId}.`, {
      gameId: partida.gameId,
      fromServerId: servidorOrigemId,
      toServerId: servidorDestino.serverId
    });

    for (const playerId of partida.playerIds || []) {
      const sessao = sessoes.get(playerId);
      if (!sessao) {
        continue;
      }

      sessao.status = "assigned";
      sessao.serverId = servidorDestino.serverId;
      sessao.serverPort = servidorDestino.publicPort;

      if (sessao.controllerSocketId) {
        io.to(sessao.controllerSocketId).emit("match-found", {
          gameId: partida.gameId,
          playerId: sessao.playerId,
          reconnectToken: sessao.reconnectToken,
          serverUrl: obterUrlPublicaServidor(servidorDestino, io.sockets.sockets.get(sessao.controllerSocketId)?.handshake),
          serverId: servidorDestino.serverId,
          migrated: true
        });
      }
    }

    return true;
  } catch (error) {
    delete partida.pendingServerId;
    registrarEvento("error", `Falha ao migrar partida ${partida?.gameId || "desconhecida"}.`, {
      gameId: partida?.gameId || null,
      error: error.message
    });
    console.error(`game migration failed for ${partida.gameId}:`, error.message);
    return false;
  } finally {
    partidasMigrando.delete(partida.gameId);
  }
}

async function reconciliarPartidasComFalha() {
  const partidasIndisponiveis = [...partidas.values()].filter((partida) => partida && partida.status !== "finished" && !servidorEstaSaudavel(partida.serverId));
  for (const partida of partidasIndisponiveis) {
    await migrarPartida(partida);
  }
}

app.get("/health", (_req, res) => {
  const servidoresSaudaveis = obterServidoresSaudaveis();
  res.json({
    status: "ok",
    service: "controller",
    servers: servidoresRegistrados.size,
    healthyServers: servidoresSaudaveis.length,
    waitingPlayers: filaDeEspera.length,
    activeGames: [...partidas.values()].filter((entry) => entry.status !== "finished").length,
    publicBaseUrl: urlBasePublica,
    timestamp: agoraIso()
  });
});

app.get("/metrics", (_req, res) => {
  const cutoff = Date.now() - REGRAS_DO_JOGO.serverHeartbeatTimeoutMs;
  res.json({
    waitingQueue: obterInstantaneoFila(),
    servers: [...servidoresRegistrados.values()].map((serverEntry) => ({
      ...serverEntry,
      healthy: serverEntry.lastHeartbeat >= cutoff,
      lastHeartbeatIso: new Date(serverEntry.lastHeartbeat).toISOString()
    })),
    sessions: [...sessoes.values()].map((session) => ({
      playerId: session.playerId,
      playerName: session.playerName,
      status: session.status,
      gameId: session.gameId,
      serverId: session.serverId,
      createdAt: session.createdAt,
      createdAtIso: new Date(session.createdAt).toISOString(),
      serverPort: session.serverPort || null
    })),
    games: [...partidas.values()].map((game) => ({
      ...game,
      createdAtIso: new Date(game.createdAt).toISOString(),
      lastMigrationAtIso: game.lastMigrationAt ? new Date(game.lastMigrationAt).toISOString() : null,
      hasSnapshot: Boolean(game.snapshot)
    })),
    events: eventosRecentes
  });
});

app.get("/ranking", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.json({
    updatedAt: agoraIso(),
    players: obterRankingOrdenado()
  });
});

app.get("/session/:playerId", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  const session = sessoes.get(req.params.playerId);
  if (!session || session.reconnectToken !== req.query.token) {
    return res.status(404).json({ error: "Sessao nao encontrada" });
  }

  return res.json({
    playerId: session.playerId,
    playerName: session.playerName,
    reconnectToken: session.reconnectToken,
    status: session.status,
    gameId: session.gameId,
    serverUrl: session.serverId ? obterUrlPublicaServidor(servidoresRegistrados.get(session.serverId), req) : null,
    serverId: session.serverId || null
  });
});

app.post("/internal/register-server", async (req, res) => {
  const { serverId, publicPort, publicUrl, internalUrl } = req.body;
  if (!serverId || !publicPort || !internalUrl) {
    return res.status(400).json({ error: "Payload invalido" });
  }

  servidoresRegistrados.set(serverId, {
    serverId,
    publicPort: Number(publicPort),
    publicUrl: publicUrl || null,
    internalUrl,
    activeGames: 0,
    lastHeartbeat: Date.now()
  });

  registrarEvento("server", `Servidor ${serverId} registrado no controller.`, {
    serverId,
    publicUrl: publicUrl || null
  });
  sincronizarCargaServidores();
  await tentarParearJogadores();
  await reconciliarPartidasComFalha();
  return res.json({ ok: true });
});

app.post("/internal/heartbeat", async (req, res) => {
  const { serverId, activeGames } = req.body;
  const entry = servidoresRegistrados.get(serverId);
  if (!entry) {
    return res.status(404).json({ error: "Servidor nao registrado" });
  }

  const estavaSaudavel = servidorEstaSaudavel(serverId);
  entry.lastHeartbeat = Date.now();
  if (!estavaSaudavel) {
    registrarEvento("server", `Servidor ${serverId} voltou a responder heartbeat.`, {
      serverId
    });
  }
  sincronizarCargaServidores();
  await tentarParearJogadores();
  await reconciliarPartidasComFalha();
  return res.json({ ok: true, activeGames: entry.activeGames, reportedActiveGames: Number(activeGames || 0) });
});

app.post("/internal/game-state", (req, res) => {
  const { serverId, game: snapshot } = req.body;
  if (!serverId || !snapshot?.gameId) {
    return res.status(400).json({ error: "Payload invalido" });
  }

  const existing = partidas.get(snapshot.gameId) || {
    gameId: snapshot.gameId,
    createdAt: snapshot.createdAt || Date.now(),
    playerIds: (snapshot.players || []).map((player) => player.playerId),
    lastMigrationAt: null
  };

  const servidorEsperado = existing.pendingServerId || existing.serverId || null;
  if (servidorEsperado && servidorEsperado !== serverId) {
    registrarEvento("warning", `Snapshot ignorado de ${serverId} para partida ${snapshot.gameId}.`, {
      gameId: snapshot.gameId,
      expectedServerId: servidorEsperado,
      receivedServerId: serverId
    });
    return res.status(409).json({
      error: "Snapshot ignorado por servidor nao proprietario",
      expectedServerId: servidorEsperado,
      receivedServerId: serverId
    });
  }

  existing.serverId = serverId;
  existing.serverPort = servidoresRegistrados.get(serverId)?.publicPort || existing.serverPort || null;
  existing.playerIds = (snapshot.players || []).map((player) => player.playerId);
  existing.status = snapshot.status;
  existing.snapshot = snapshot;
  delete existing.pendingServerId;
  partidas.set(snapshot.gameId, existing);
  sincronizarCargaServidores();

  for (const player of snapshot.players || []) {
    const session = sessoes.get(player.playerId);
    if (!session) {
      continue;
    }

    session.gameId = snapshot.gameId;
    session.serverId = serverId;
    session.serverPort = servidoresRegistrados.get(serverId)?.publicPort || session.serverPort || null;
    session.status = snapshot.status === "finished"
      ? (snapshot.winnerPlayerId === player.playerId ? "winner" : "finished")
      : "assigned";
  }

  return res.json({ ok: true });
});

app.post("/internal/game-finished", (req, res) => {
  const { gameId, winnerPlayerId, reason } = req.body;
  const game = partidas.get(gameId);
  if (game) {
    game.status = "finished";
    if (game.snapshot) {
      game.snapshot.status = "finished";
      game.snapshot.winnerPlayerId = winnerPlayerId;
      game.snapshot.reason = reason;
    }
  }
  sincronizarCargaServidores();

  const nomesPorJogador = new Map(
    (game?.snapshot?.players || [])
      .map((player) => [player.playerId, player.playerName])
  );
  registrarEvento("game-over", `Partida ${gameId} encerrada.`, {
    gameId,
    winnerPlayerId,
    reason
  });

  for (const session of sessoes.values()) {
    if (session.gameId !== gameId) {
      continue;
    }

    session.status = session.playerId === winnerPlayerId ? "winner" : "finished";
    const nomeRanking = session.playerName || nomesPorJogador.get(session.playerId);
    registrarResultadoNoRanking(nomeRanking, session.playerId === winnerPlayerId ? "win" : "loss");
  }

  return res.json({ ok: true });
});

io.on("connection", (socket) => {
  socket.emit("queue-public-update", {
    waitingCount: filaDeEspera.length
  });

  socket.on("join-lobby", async (payload = {}) => {
    const nomeRecebido = String(payload.playerName || "Jogador").trim().slice(0, 24) || "Jogador";
    const idJogadorExistente = payload.playerId;
    const tokenReconexao = payload.reconnectToken;
    const validacaoNome = validarNomeDisponivel(nomeRecebido, idJogadorExistente);
    if (!validacaoNome.disponivel) {
      socket.emit("join-error", {
        message: `O nome ${nomeRecebido} ja esta em uso. Escolha outro nome.`
      });
      return;
    }

    let sessao;
    if (idJogadorExistente && tokenReconexao) {
      const existente = sessoes.get(idJogadorExistente);
      if (existente && existente.reconnectToken === tokenReconexao) {
        sessao = existente;
        sessao.playerName = nomeRecebido;
        sessao.controllerSocketId = socket.id;
        clearTimeout(temporizadoresDesconexaoLobby.get(sessao.playerId));
        temporizadoresDesconexaoLobby.delete(sessao.playerId);
      }
    }

    if (!sessao) {
      sessao = {
        playerId: gerarId("player"),
        playerName: nomeRecebido,
        reconnectToken: gerarId("token"),
        controllerSocketId: socket.id,
        status: "waiting",
        createdAt: Date.now(),
        gameId: null,
        serverId: null,
        serverPort: null
      };
      sessoes.set(sessao.playerId, sessao);
      registrarEvento("session", `Sessao criada para ${sessao.playerName}.`, {
        playerId: sessao.playerId,
        playerName: sessao.playerName
      });
    } else {
      registrarEvento("session", `Sessao restaurada para ${sessao.playerName}.`, {
        playerId: sessao.playerId,
        playerName: sessao.playerName
      });
    }

    registrarJogadorNoRanking(sessao.playerName);

    socket.data.playerId = sessao.playerId;
    socket.emit("lobby-joined", {
      playerId: sessao.playerId,
      playerName: sessao.playerName,
      reconnectToken: sessao.reconnectToken,
      reconnectGraceMs: REGRAS_DO_JOGO.reconnectGraceMs
    });

    if (["assigned", "playing", "winner", "finished"].includes(sessao.status)) {
      socket.emit("match-found", {
        gameId: sessao.gameId,
        playerId: sessao.playerId,
        reconnectToken: sessao.reconnectToken,
        serverUrl: sessao.serverId ? obterUrlPublicaServidor(servidoresRegistrados.get(sessao.serverId), socket.handshake) : null,
        serverId: sessao.serverId
      });
      return;
    }

    enfileirarJogador(sessao);
    await tentarParearJogadores();
  });

  socket.on("leave-queue", (payload = {}) => {
    const playerId = payload.playerId || socket.data.playerId;
    const tokenReconexao = payload.reconnectToken;
    if (!playerId || !tokenReconexao) {
      socket.emit("queue-left", { message: "Nao foi possivel cancelar a fila." });
      return;
    }

    const sessao = sessoes.get(playerId);
    if (!sessao || sessao.reconnectToken !== tokenReconexao) {
      socket.emit("queue-left", { message: "Sua sessao de fila nao foi encontrada." });
      return;
    }

    if (sessao.status !== "waiting") {
      socket.emit("queue-left", { message: "Voce ja nao esta mais na fila." });
      return;
    }

    encerrarSessaoDeFila(sessao);
    socket.emit("queue-left", { message: "Voce saiu da fila de espera." });
  });

  socket.on("disconnect", () => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      return;
    }

    const session = sessoes.get(playerId);
    if (!session) {
      return;
    }

    if (session.status === "waiting") {
      const timer = setTimeout(() => {
        removerDaFila(playerId);
        sessoes.delete(playerId);
        temporizadoresDesconexaoLobby.delete(playerId);
        registrarEvento("session", `Sessao de ${session.playerName} expirou no lobby.`, {
          playerId,
          playerName: session.playerName
        });
      }, REGRAS_DO_JOGO.reconnectGraceMs);
      temporizadoresDesconexaoLobby.set(playerId, timer);
      return;
    }

    if (["finished", "winner"].includes(session.status)) {
      removerSessao(session, "finished-session-disconnected");
    }
  });
});

setInterval(() => {
  reconciliarPartidasComFalha().catch((error) => {
    console.error("failover reconcile failed", error.message);
  });
}, REGRAS_DO_JOGO.failoverPollMs);

server.listen(porta, () => {
  console.log(`controller listening on ${urlBasePublica}`);
});

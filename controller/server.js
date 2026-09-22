const express = require("express");
const cors = require("cors");
const http = require("http");
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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../web-client/public")));

const servidoresRegistrados = new Map();
const sessoes = new Map();
const partidas = new Map();
const filaDeEspera = [];
const temporizadoresDesconexaoLobby = new Map();
const partidasMigrando = new Set();

function gerarId(prefixo) {
  return `${prefixo}-${crypto.randomUUID()}`;
}

function agoraIso() {
  return new Date().toISOString();
}

function obterHostnameRequisicao(origem) {
  const hostBruto = origem?.headers?.["x-forwarded-host"] || origem?.headers?.host || origem?.get?.("x-forwarded-host") || origem?.get?.("host") || "localhost";
  return String(hostBruto).split(":")[0];
}

function montarUrlPublicaServidor(hostname, portaServidor) {
  return `http://${hostname}:${portaServidor}`;
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

function emitirAtualizacoesFila() {
  const snapshot = obterInstantaneoFila();
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
  if (filaDeEspera.some((entry) => entry.playerId === sessao.playerId)) {
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
  emitirAtualizacoesFila();
}

function removerDaFila(playerId) {
  const index = filaDeEspera.findIndex((entry) => entry.playerId === playerId);
  if (index >= 0) {
    filaDeEspera.splice(index, 1);
    emitirAtualizacoesFila();
  }
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
      servidorSelecionado.activeGames += 1;
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

      const hostA = obterHostnameRequisicao(io.sockets.sockets.get(sessaoA.controllerSocketId)?.handshake);
      const hostB = obterHostnameRequisicao(io.sockets.sockets.get(sessaoB.controllerSocketId)?.handshake);

      for (const sessao of [sessaoA, sessaoB]) {
        sessao.status = "assigned";
        sessao.gameId = gameId;
        sessao.serverId = servidorSelecionado.serverId;
        sessao.serverPort = servidorSelecionado.publicPort;
      }

      io.to(sessaoA.controllerSocketId).emit("match-found", {
        gameId,
        playerId: sessaoA.playerId,
        reconnectToken: sessaoA.reconnectToken,
        serverUrl: montarUrlPublicaServidor(hostA, servidorSelecionado.publicPort),
        serverId: servidorSelecionado.serverId,
        opponentName: sessaoB.playerName
      });
      io.to(sessaoB.controllerSocketId).emit("match-found", {
        gameId,
        playerId: sessaoB.playerId,
        reconnectToken: sessaoB.reconnectToken,
        serverUrl: montarUrlPublicaServidor(hostB, servidorSelecionado.publicPort),
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

    await restaurarPartidaNoServidor(servidorDestino, snapshot);

    const servidorAnterior = servidoresRegistrados.get(partida.serverId);
    if (servidorAnterior) {
      servidorAnterior.activeGames = Math.max(0, servidorAnterior.activeGames - 1);
    }
    servidorDestino.activeGames += 1;

    partida.serverId = servidorDestino.serverId;
    partida.serverPort = servidorDestino.publicPort;
    partida.status = snapshot.status;
    partida.lastMigrationAt = Date.now();
    partida.snapshot = snapshot;

    for (const playerId of partida.playerIds || []) {
      const sessao = sessoes.get(playerId);
      if (!sessao) {
        continue;
      }

      sessao.status = "assigned";
      sessao.serverId = servidorDestino.serverId;
      sessao.serverPort = servidorDestino.publicPort;

      if (sessao.controllerSocketId) {
        const host = obterHostnameRequisicao(io.sockets.sockets.get(sessao.controllerSocketId)?.handshake);
        io.to(sessao.controllerSocketId).emit("match-found", {
          gameId: partida.gameId,
          playerId: sessao.playerId,
          reconnectToken: sessao.reconnectToken,
          serverUrl: montarUrlPublicaServidor(host, servidorDestino.publicPort),
          serverId: servidorDestino.serverId,
          migrated: true
        });
      }
    }

    return true;
  } catch (error) {
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
    }))
  });
});

app.get("/session/:playerId", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  const hostname = obterHostnameRequisicao(req);
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
    serverUrl: session.serverPort ? montarUrlPublicaServidor(hostname, session.serverPort) : null,
    serverId: session.serverId || null
  });
});

app.post("/internal/register-server", async (req, res) => {
  const { serverId, publicPort, internalUrl } = req.body;
  if (!serverId || !publicPort || !internalUrl) {
    return res.status(400).json({ error: "Payload invalido" });
  }

  servidoresRegistrados.set(serverId, {
    serverId,
    publicPort: Number(publicPort),
    internalUrl,
    activeGames: 0,
    lastHeartbeat: Date.now()
  });

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

  entry.activeGames = Number(activeGames || 0);
  entry.lastHeartbeat = Date.now();
  await tentarParearJogadores();
  await reconciliarPartidasComFalha();
  return res.json({ ok: true });
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

  existing.serverId = serverId;
  existing.serverPort = servidoresRegistrados.get(serverId)?.publicPort || existing.serverPort || null;
  existing.playerIds = (snapshot.players || []).map((player) => player.playerId);
  existing.status = snapshot.status;
  existing.snapshot = snapshot;
  partidas.set(snapshot.gameId, existing);

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

  for (const session of sessoes.values()) {
    if (session.gameId !== gameId) {
      continue;
    }

    session.status = session.playerId === winnerPlayerId ? "winner" : "finished";
  }

  return res.json({ ok: true });
});

io.on("connection", (socket) => {
  socket.on("join-lobby", async (payload = {}) => {
    const nomeRecebido = String(payload.playerName || "Jogador").trim().slice(0, 24) || "Jogador";
    const idJogadorExistente = payload.playerId;
    const tokenReconexao = payload.reconnectToken;

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
    }

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
        serverUrl: sessao.serverPort ? montarUrlPublicaServidor(obterHostnameRequisicao(socket.handshake), sessao.serverPort) : null,
        serverId: sessao.serverId
      });
      return;
    }

    enfileirarJogador(sessao);
    await tentarParearJogadores();
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
      }, REGRAS_DO_JOGO.reconnectGraceMs);
      temporizadoresDesconexaoLobby.set(playerId, timer);
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

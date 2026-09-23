const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Server } = require("socket.io");
const { REGRAS_DO_JOGO, PARTES_DA_FORCA } = require("../shared/config");
const palavras = require("./words");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const porta = Number(process.env.PORT || process.env.GAME_SERVER_PORT || 4000);
const idServidor = process.env.SERVER_ID || process.env.GAME_SERVER_ID || `game-server-${porta}`;
const urlController = process.env.CONTROLLER_URL || "http://localhost:3000";
const urlPublicaServidor = process.env.PUBLIC_SERVER_URL || process.env.GAME_SERVER_PUBLIC_URL || `http://localhost:${porta}`;
const urlInterna = process.env.INTERNAL_SERVER_URL || process.env.GAME_SERVER_INTERNAL_URL || `http://localhost:${porta}`;

const partidas = new Map();
let servidorRegistrado = false;

app.use(cors());
app.use(express.json());

function sortearPalavra() {
  return palavras[Math.floor(Math.random() * palavras.length)];
}

function mascararPalavra(palavra, letras) {
  return [...palavra].map((caractere) => (letras.has(caractere) ? caractere.toUpperCase() : "_")).join(" ");
}

function serializarPartida(partida) {
  return {
    gameId: partida.gameId,
    word: partida.word,
    topic: partida.topic,
    hint: partida.hint,
    hintRequested: partida.hintRequested,
    status: partida.status,
    players: partida.players.map((jogador) => ({
      playerId: jogador.playerId,
      playerName: jogador.playerName,
      reconnectToken: jogador.reconnectToken,
      errors: jogador.errors,
      connected: jogador.connected,
      disconnectDeadline: jogador.disconnectDeadline || null
    })),
    turnIndex: partida.turnIndex,
    attemptedLetters: [...partida.attemptedLetters],
    wrongLetters: [...partida.wrongLetters],
    correctLetters: [...partida.correctLetters],
    turnDeadline: partida.turnDeadline || null,
    winnerPlayerId: partida.winnerPlayerId,
    loserPlayerId: partida.loserPlayerId,
    createdAt: partida.createdAt
  };
}

async function sincronizarEstadoPartida(partida) {
  try {
    await fetch(`${urlController}/internal/game-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        serverId: idServidor,
        game: serializarPartida(partida)
      })
    });
  } catch (error) {
    console.error("controller state sync failed", error.message);
  }
}

function montarEstadoPublico(partida, idVisualizador) {
  const visualizador = partida.players.find((jogador) => jogador.playerId === idVisualizador);
  return {
    gameId: partida.gameId,
    serverId: idServidor,
    status: partida.status,
    topic: partida.topic,
    hint: partida.hint,
    hintRequested: partida.hintRequested,
    maskedWord: mascararPalavra(partida.word, partida.correctLetters),
    attemptedLetters: [...partida.attemptedLetters],
    wrongLetters: [...partida.wrongLetters],
    players: partida.players.map((jogador, indice) => ({
      playerId: jogador.playerId,
      playerName: jogador.playerName,
      connected: jogador.connected,
      errors: jogador.errors,
      isTurn: partida.turnIndex === indice,
      remainingReconnectMs: jogador.disconnectDeadline ? Math.max(jogador.disconnectDeadline - Date.now(), 0) : 0,
      hangmanPartsDrawn: PARTES_DA_FORCA.slice(0, jogador.errors)
    })),
    currentTurnPlayerId: partida.players[partida.turnIndex]?.playerId || null,
    currentTurnPlayerName: partida.players[partida.turnIndex]?.playerName || null,
    remainingTurnMs: partida.turnDeadline ? Math.max(partida.turnDeadline - Date.now(), 0) : null,
    turnTimeLimitMs: REGRAS_DO_JOGO.turnTimeLimitMs,
    winnerPlayerId: partida.winnerPlayerId,
    loserPlayerId: partida.loserPlayerId,
    viewerPlayerId: visualizador ? visualizador.playerId : null,
    maxErrors: REGRAS_DO_JOGO.maxErrors,
    hangmanPartsDrawn: PARTES_DA_FORCA.slice(0, visualizador ? visualizador.errors : 0),
    semaphore: {
      activePlayerId: partida.players[partida.turnIndex]?.playerId || null,
      activePlayerName: partida.players[partida.turnIndex]?.playerName || null,
      state: partida.status === "playing" ? "green" : "red"
    }
  };
}

function emitirEstadoPartida(partida) {
  for (const jogador of partida.players) {
    if (!jogador.socketId) {
      continue;
    }

    io.to(jogador.socketId).emit("game-state", montarEstadoPublico(partida, jogador.playerId));
  }
}

async function notificarControllerEncerramento(partida, motivo) {
  try {
    await fetch(`${urlController}/internal/game-finished`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        gameId: partida.gameId,
        winnerPlayerId: partida.winnerPlayerId,
        loserPlayerId: partida.loserPlayerId,
        reason: motivo
      })
    });
  } catch (error) {
    console.error("controller notification failed", error.message);
  }
}

function limparTemporizadorTurno(partida) {
  if (partida.turnTimer) {
    clearTimeout(partida.turnTimer);
    partida.turnTimer = null;
  }
  partida.turnDeadline = null;
}

function avancarTurno(partida) {
  partida.turnIndex = partida.turnIndex === 0 ? 1 : 0;
}

function registrarTempoLimiteTurno(partida) {
  limparTemporizadorTurno(partida);
  if (partida.status !== "playing") {
    return;
  }

  partida.turnDeadline = Date.now() + REGRAS_DO_JOGO.turnTimeLimitMs;
  partida.turnTimer = setTimeout(async () => {
    if (partida.status !== "playing") {
      return;
    }

    const jogadorAtual = partida.players[partida.turnIndex];
    if (!jogadorAtual) {
      return;
    }

    avancarTurno(partida);
    const proximoJogador = partida.players[partida.turnIndex];
    limparTemporizadorTurno(partida);
    registrarTempoLimiteTurno(partida);

    io.to(partida.gameId).emit("guess-feedback", {
      type: "info",
      message: `Tempo de ${jogadorAtual.playerName} esgotado. Vez de ${proximoJogador?.playerName || "aguardar"}.`
    });
    emitirEstadoPartida(partida);
    await sincronizarEstadoPartida(partida);
  }, REGRAS_DO_JOGO.turnTimeLimitMs);
}

function encerrarPartida(partida, idJogadorVencedor, idJogadorPerdedor, motivo) {
  partida.status = "finished";
  partida.winnerPlayerId = idJogadorVencedor;
  partida.loserPlayerId = idJogadorPerdedor;
  limparTemporizadorTurno(partida);
  for (const jogador of partida.players) {
    if (jogador.disconnectTimer) {
      clearTimeout(jogador.disconnectTimer);
      jogador.disconnectTimer = null;
      jogador.disconnectDeadline = null;
    }
  }
  emitirEstadoPartida(partida);
  io.to(partida.gameId).emit("game-over", {
    winnerPlayerId: idJogadorVencedor,
    loserPlayerId: idJogadorPerdedor,
    reason: motivo
  });
  sincronizarEstadoPartida(partida);
  notificarControllerEncerramento(partida, motivo);
}

function registrarTempoLimiteDesconexao(partida, jogador) {
  if (jogador.disconnectTimer) {
    clearTimeout(jogador.disconnectTimer);
  }

  jogador.disconnectDeadline = Date.now() + REGRAS_DO_JOGO.reconnectGraceMs;
  jogador.disconnectTimer = setTimeout(() => {
    const adversario = partida.players.find((entrada) => entrada.playerId !== jogador.playerId);
    if (!adversario || partida.status === "finished") {
      return;
    }

    encerrarPartida(partida, adversario.playerId, jogador.playerId, "opponent-timeout");
  }, REGRAS_DO_JOGO.reconnectGraceMs);
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: idServidor,
    activeGames: [...partidas.values()].filter((partida) => partida.status !== "finished").length,
    timestamp: new Date().toISOString()
  });
});

app.get("/metrics", (_req, res) => {
  res.json({
    serverId: idServidor,
    activeGames: [...partidas.values()].map((partida) => ({
      gameId: partida.gameId,
      status: partida.status,
      players: partida.players.map((jogador) => ({
        playerId: jogador.playerId,
        playerName: jogador.playerName,
        errors: jogador.errors,
        connected: jogador.connected
      }))
    }))
  });
});

app.post("/internal/create-game", async (req, res) => {
  const { gameId, players } = req.body;
  if (!gameId || !Array.isArray(players) || players.length !== 2) {
    return res.status(400).json({ error: "Payload invalido" });
  }

  const palavraSorteada = sortearPalavra();
  const partida = {
    gameId,
    word: palavraSorteada.palavra,
    topic: palavraSorteada.tema,
    hint: palavraSorteada.dica,
    hintRequested: false,
    status: "waiting-players",
    players: players.map((jogador) => ({
      ...jogador,
      errors: 0,
      connected: false,
      socketId: null,
      disconnectTimer: null,
      disconnectDeadline: null
    })),
    turnIndex: 0,
    attemptedLetters: new Set(),
    wrongLetters: [],
    correctLetters: new Set(),
    turnTimer: null,
    turnDeadline: null,
    winnerPlayerId: null,
    loserPlayerId: null,
    createdAt: Date.now()
  };

  partidas.set(gameId, partida);
  await sincronizarEstadoPartida(partida);
  return res.json({ ok: true, serverId: idServidor, publicServerUrl: urlPublicaServidor });
});

app.post("/internal/restore-game", async (req, res) => {
  const { snapshot } = req.body;
  if (!snapshot?.gameId || !Array.isArray(snapshot.players) || snapshot.players.length !== 2) {
    return res.status(400).json({ error: "Payload invalido" });
  }

  const partida = {
    gameId: snapshot.gameId,
    word: snapshot.word,
    topic: snapshot.topic || null,
    hint: snapshot.hint,
    hintRequested: Boolean(snapshot.hintRequested),
    status: snapshot.status || "waiting-players",
    players: snapshot.players.map((jogador) => ({
      ...jogador,
      connected: false,
      socketId: null,
      disconnectTimer: null,
      disconnectDeadline: null
    })),
    turnIndex: snapshot.turnIndex || 0,
    attemptedLetters: new Set(snapshot.attemptedLetters || []),
    wrongLetters: [...(snapshot.wrongLetters || [])],
    correctLetters: new Set(snapshot.correctLetters || []),
    turnTimer: null,
    turnDeadline: null,
    winnerPlayerId: snapshot.winnerPlayerId || null,
    loserPlayerId: snapshot.loserPlayerId || null,
    createdAt: snapshot.createdAt || Date.now()
  };

  partidas.set(partida.gameId, partida);
  await sincronizarEstadoPartida(partida);
  return res.json({ ok: true, serverId: idServidor, publicServerUrl: urlPublicaServidor });
});

io.on("connection", (socket) => {
  socket.on("join-game", async ({ gameId, playerId, reconnectToken }) => {
    const partida = partidas.get(gameId);
    if (!partida) {
      socket.emit("join-error", { message: "Partida nao encontrada." });
      return;
    }

    const jogador = partida.players.find((entrada) => entrada.playerId === playerId && entrada.reconnectToken === reconnectToken);
    if (!jogador) {
      socket.emit("join-error", { message: "Credenciais invalidas para reconexao." });
      return;
    }

    socket.join(partida.gameId);
    socket.data.gameId = partida.gameId;
    socket.data.playerId = jogador.playerId;
    jogador.socketId = socket.id;
    jogador.connected = true;

    if (jogador.disconnectTimer) {
      clearTimeout(jogador.disconnectTimer);
      jogador.disconnectTimer = null;
      jogador.disconnectDeadline = null;
    }

    if (partida.players.every((entrada) => entrada.connected) && partida.status !== "finished") {
      const precisaIniciarTemporizador = partida.status !== "playing" || !partida.turnTimer;
      partida.status = "playing";
      if (precisaIniciarTemporizador) {
        registrarTempoLimiteTurno(partida);
      }
    }

    emitirEstadoPartida(partida);
    await sincronizarEstadoPartida(partida);
    socket.emit("joined-game", {
      gameId: partida.gameId,
      serverId: idServidor,
      reconnectGraceMs: REGRAS_DO_JOGO.reconnectGraceMs
    });
  });

  socket.on("guess-letter", async ({ gameId, playerId, letter }) => {
    const partida = partidas.get(gameId);
    if (!partida || partida.status !== "playing") {
      return;
    }

    if (partida.processingGuess) {
      io.to(socket.id).emit("guess-feedback", { type: "info", message: "Semáforo ocupado: processando jogada anterior..." });
      return;
    }

    const letraNormalizada = String(letter || "").trim().toLowerCase();
    if (!/^[a-z]$/.test(letraNormalizada)) {
      io.to(socket.id).emit("guess-feedback", { type: "error", message: "Envie apenas uma letra de A a Z." });
      return;
    }

    const jogadorAtual = partida.players[partida.turnIndex];
    if (!jogadorAtual || jogadorAtual.playerId !== playerId) {
      io.to(socket.id).emit("guess-feedback", { type: "error", message: "Semáforo fechado para você! Aguarde o turno do adversário." });
      return;
    }

    if (partida.attemptedLetters.has(letraNormalizada)) {
      io.to(socket.id).emit("guess-feedback", { type: "error", message: "Essa letra já foi tentada." });
      return;
    }

    partida.processingGuess = true;
    try {
      limparTemporizadorTurno(partida);
      partida.attemptedLetters.add(letraNormalizada);
      if (partida.word.includes(letraNormalizada)) {
        partida.correctLetters.add(letraNormalizada);
        io.to(partida.gameId).emit("guess-feedback", {
          type: "success",
          message: `${jogadorAtual.playerName} acertou a letra ${letraNormalizada.toUpperCase()}!`
        });

        const palavraCompleta = [...new Set(partida.word.split(""))].every((caractere) => partida.correctLetters.has(caractere));
        if (palavraCompleta) {
          encerrarPartida(
            partida,
            jogadorAtual.playerId,
            partida.players.find((entrada) => entrada.playerId !== jogadorAtual.playerId)?.playerId || null,
            "word-complete"
          );
          return;
        }
      } else {
        jogadorAtual.errors += 1;
        partida.wrongLetters.push(letraNormalizada);
        const partesDesenhas = PARTES_DA_FORCA.slice(0, jogadorAtual.errors);
        io.to(partida.gameId).emit("player-hangman-update", {
          playerId: jogadorAtual.playerId,
          playerName: jogadorAtual.playerName,
          errors: jogadorAtual.errors,
          maxErrors: REGRAS_DO_JOGO.maxErrors,
          hangmanPartsDrawn: partesDesenhas
        });

        io.to(partida.gameId).emit("guess-feedback", {
          type: "warning",
          message: `${jogadorAtual.playerName} errou a letra ${letraNormalizada.toUpperCase()}. Adicionada parte à forca de ${jogadorAtual.playerName}!`
        });

        if (jogadorAtual.errors >= REGRAS_DO_JOGO.maxErrors) {
          const adversario = partida.players.find((entrada) => entrada.playerId !== jogadorAtual.playerId);
          encerrarPartida(partida, adversario ? adversario.playerId : null, jogadorAtual.playerId, "max-errors");
          return;
        }

        avancarTurno(partida);
      }

      registrarTempoLimiteTurno(partida);
      emitirEstadoPartida(partida);
      await sincronizarEstadoPartida(partida);
    } finally {
      partida.processingGuess = false;
    }
  });

  socket.on("request-hint", async ({ gameId, playerId }) => {
    const partida = partidas.get(gameId);
    if (!partida || partida.status === "finished") {
      return;
    }

    const jogador = partida.players.find((entrada) => entrada.playerId === playerId);
    if (!jogador) {
      io.to(socket.id).emit("guess-feedback", { type: "error", message: "Jogador invalido para pedir dica." });
      return;
    }

    if (partida.hintRequested) {
      emitirEstadoPartida(partida);
      return;
    }

    partida.hintRequested = true;
    io.to(partida.gameId).emit("guess-feedback", {
      type: "info",
      message: `${jogador.playerName} pediu a dica.`
    });
    emitirEstadoPartida(partida);
    await sincronizarEstadoPartida(partida);
  });

  socket.on("surrender-game", async ({ gameId, playerId }) => {
    const partida = partidas.get(gameId);
    if (!partida || partida.status === "finished") {
      return;
    }

    const jogador = partida.players.find((entrada) => entrada.playerId === playerId);
    const adversario = partida.players.find((entrada) => entrada.playerId !== playerId);
    if (!jogador || !adversario) {
      return;
    }

    io.to(partida.gameId).emit("guess-feedback", {
      type: "info",
      message: `${jogador.playerName} desistiu da partida.`
    });
    encerrarPartida(partida, adversario.playerId, jogador.playerId, "opponent-surrender");
  });

  socket.on("disconnect", async () => {
    const { gameId, playerId } = socket.data;
    if (!gameId || !playerId) {
      return;
    }

    const partida = partidas.get(gameId);
    if (!partida || partida.status === "finished") {
      return;
    }

    const jogador = partida.players.find((entrada) => entrada.playerId === playerId);
    if (!jogador) {
      return;
    }

    jogador.connected = false;
    jogador.socketId = null;
    if (partida.players[partida.turnIndex]?.playerId === jogador.playerId) {
      limparTemporizadorTurno(partida);
    }
    registrarTempoLimiteDesconexao(partida, jogador);

    io.to(partida.gameId).emit("player-disconnected", {
      playerId,
      reconnectGraceMs: REGRAS_DO_JOGO.reconnectGraceMs
    });
    emitirEstadoPartida(partida);
    await sincronizarEstadoPartida(partida);
  });
});

async function registrarNoController() {
  const resposta = await fetch(`${urlController}/internal/register-server`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      serverId: idServidor,
      publicPort: porta,
      publicUrl: urlPublicaServidor,
      internalUrl: urlInterna
    })
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao registrar ${idServidor} no controller`);
  }

  servidorRegistrado = true;
}

async function enviarHeartbeat() {
  const resposta = await fetch(`${urlController}/internal/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      serverId: idServidor,
      activeGames: [...partidas.values()].filter((partida) => partida.status !== "finished").length
    })
  });

  if (!resposta.ok) {
    throw new Error(`Heartbeat rejeitado para ${idServidor}`);
  }
}

async function garantirRegistroNoController() {
  try {
    if (!servidorRegistrado) {
      await registrarNoController();
      console.log(`${idServidor} registrado no controller ${urlController}`);
    }

    await enviarHeartbeat();
  } catch (error) {
    servidorRegistrado = false;
    console.error(`${idServidor} controller sync failed: ${error.message}`);
  }
}

server.listen(porta, async () => {
  console.log(`${idServidor} listening on ${urlPublicaServidor}`);
  await garantirRegistroNoController();
  setInterval(garantirRegistroNoController, 5_000);
});

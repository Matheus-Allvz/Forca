const tituloPartida = document.querySelector("#game-title");
const subtituloPartida = document.querySelector("#game-subtitle");
const seloServidor = document.querySelector("#server-badge");
const faixaTurno = document.querySelector("#turn-banner");
const palavraMascarada = document.querySelector("#masked-word");
const temaPartida = document.querySelector("#theme");
const textoDica = document.querySelector("#hint");
const botaoDica = document.querySelector("#hint-toggle");
const letrasErradas = document.querySelector("#wrong-letters");
const containerJogadores = document.querySelector("#players");
const formularioPalpite = document.querySelector("#guess-form");
const campoPalpite = document.querySelector("#guess-input");
const listaEventos = document.querySelector("#event-log");

const chaveSessao = "forca-distribuida-session";
const chavePartida = "forca-distribuida-match";
const sessao = carregarJson(chaveSessao);
const socketController = io();
let dadosPartida = carregarJson(chavePartida);
let estadoAtual = null;
let socketPartida = null;
let temporizadorRecuperacao = null;
let desconexaoEsperada = false;

function carregarJson(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave) || "null");
  } catch {
    return null;
  }
}

function salvarJson(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

function adicionarLog(mensagem) {
  const item = document.createElement("li");
  item.textContent = `[${new Date().toLocaleTimeString()}] ${mensagem}`;
  listaEventos.prepend(item);
}

function renderizarForca(partes) {
  document.querySelectorAll(".part").forEach((elemento) => {
    elemento.classList.toggle("visible", partes.includes(elemento.dataset.part));
  });
}

function atualizarFaixaTurno(tipo, mensagem) {
  faixaTurno.className = `turn-banner ${tipo}`;
  faixaTurno.textContent = mensagem;
}

function atualizarDadosPartida(proximosDados) {
  dadosPartida = {
    ...dadosPartida,
    ...proximosDados,
    playerId: sessao.playerId,
    reconnectToken: sessao.reconnectToken
  };
  salvarJson(chavePartida, dadosPartida);
}

function renderizarJogadores(estado) {
  containerJogadores.innerHTML = "";
  estado.players.forEach((jogador) => {
    const card = document.createElement("article");
    card.className = "player-card";
    if (jogador.isTurn) {
      card.classList.add("active");
    }
    if (!jogador.connected) {
      card.classList.add("disconnected");
    }

    const textoReconexao = !jogador.connected && jogador.remainingReconnectMs > 0
      ? `Reconectando ate ${Math.ceil(jogador.remainingReconnectMs / 1000)}s`
      : (jogador.connected ? "Conectado" : "Desconectado");

    card.innerHTML = `
      <strong>${jogador.playerName}</strong>
      <p>Erros: ${jogador.errors}/${estado.maxErrors}</p>
      <p>${jogador.isTurn ? "Na vez" : "Fora da vez"}</p>
      <p>${textoReconexao}</p>
    `;
    containerJogadores.appendChild(card);
  });
}

function renderizarEstadoPartida(estado) {
  estadoAtual = estado;
  seloServidor.textContent = estado.serverId;
  tituloPartida.textContent = "Partida em andamento";
  subtituloPartida.textContent = estado.status === "finished" ? "Partida encerrada" : `Vez de ${estado.currentTurnPlayerName || "aguardar"}`;
  palavraMascarada.textContent = estado.maskedWord;
  temaPartida.textContent = `Tema: ${estado.topic || "nao informado"}`;
  textoDica.textContent = `Dica: ${estado.hint || "indisponivel"}`;
  textoDica.hidden = !estado.hintRequested;
  botaoDica.textContent = estado.hintRequested ? "Dica exibida para todos" : "Pedir dica";
  botaoDica.disabled = estado.hintRequested;
  letrasErradas.textContent = estado.wrongLetters.length ? estado.wrongLetters.join(", ").toUpperCase() : "Nenhuma";
  renderizarForca(estado.hangmanPartsDrawn);
  renderizarJogadores(estado);

  const visualizador = estado.players.find((jogador) => jogador.playerId === estado.viewerPlayerId);
  const podeJogar = estado.status === "playing" && visualizador && visualizador.isTurn && visualizador.connected;
  campoPalpite.disabled = !podeJogar;
  formularioPalpite.querySelector("button").disabled = !podeJogar;

  if (estado.status === "finished") {
    atualizarFaixaTurno("finished", estado.winnerPlayerId === estado.viewerPlayerId ? "Partida encerrada. Voce venceu." : "Partida encerrada. Voce perdeu.");
  } else if (podeJogar) {
    atualizarFaixaTurno("active", "Sua vez de jogar. Escolha uma letra.");
    campoPalpite.focus();
  } else {
    atualizarFaixaTurno("idle", `Aguarde. Agora e a vez de ${estado.currentTurnPlayerName || "seu adversario"}.`);
  }
}

botaoDica.addEventListener("click", () => {
  if (!socketPartida || !estadoAtual || estadoAtual.hintRequested) {
    return;
  }

  socketPartida.emit("request-hint", {
    gameId: estadoAtual.gameId,
    playerId: sessao.playerId
  });
});

function pararRecuperacao() {
  if (temporizadorRecuperacao) {
    clearInterval(temporizadorRecuperacao);
    temporizadorRecuperacao = null;
  }
}

async function consultarFailover() {
  if (!sessao?.playerId || !sessao?.reconnectToken) {
    return;
  }

  try {
    const resposta = await fetch(`/session/${sessao.playerId}?token=${sessao.reconnectToken}&t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) {
      return;
    }

    const estadoServidor = await resposta.json();
    if (!estadoServidor.serverUrl || !estadoServidor.gameId) {
      return;
    }

    const servidorMudou = estadoServidor.serverUrl !== dadosPartida?.serverUrl;
    atualizarDadosPartida({
      gameId: estadoServidor.gameId,
      serverUrl: estadoServidor.serverUrl,
      serverId: estadoServidor.serverId
    });

    if (servidorMudou || !socketPartida || !socketPartida.connected) {
      adicionarLog(`Partida restaurada em ${estadoServidor.serverId || estadoServidor.serverUrl}. Reconectando...`);
      conectarNaPartida();
    }
  } catch {
    atualizarFaixaTurno("waiting", "Aguardando migracao da partida para outro servidor...");
  }
}

function iniciarRecuperacao() {
  if (temporizadorRecuperacao) {
    return;
  }

  campoPalpite.disabled = true;
  formularioPalpite.querySelector("button").disabled = true;
  atualizarFaixaTurno("waiting", "Servidor indisponivel. Aguardando migracao da partida...");
  temporizadorRecuperacao = setInterval(consultarFailover, 3000);
  consultarFailover();
}

function conectarNaPartida() {
  if (!dadosPartida?.serverUrl || !dadosPartida?.gameId || !sessao?.playerId || !sessao?.reconnectToken) {
    window.location.href = "/";
    return;
  }

  pararRecuperacao();
  if (socketPartida) {
    desconexaoEsperada = true;
    socketPartida.removeAllListeners();
    socketPartida.disconnect();
  }

  desconexaoEsperada = false;
  socketPartida = io(dadosPartida.serverUrl, { transports: ["websocket", "polling"] });
  adicionarLog(`Conectando ao servidor ${dadosPartida.serverUrl}.`);

  socketPartida.on("connect", () => {
    pararRecuperacao();
    socketPartida.emit("join-game", {
      gameId: dadosPartida.gameId,
      playerId: sessao.playerId,
      reconnectToken: sessao.reconnectToken
    });
  });

  socketPartida.on("disconnect", () => {
    if (desconexaoEsperada) {
      desconexaoEsperada = false;
      return;
    }

    adicionarLog("Conexao com o servidor da partida foi perdida.");
    iniciarRecuperacao();
  });

  socketPartida.on("joined-game", ({ serverId }) => {
    seloServidor.textContent = serverId;
    adicionarLog(`Partida conectada em ${serverId}.`);
  });

  socketPartida.on("game-state", (estado) => {
    renderizarEstadoPartida(estado);
  });

  socketPartida.on("guess-feedback", ({ message }) => {
    adicionarLog(message);
  });

  socketPartida.on("player-disconnected", ({ playerId, reconnectGraceMs }) => {
    const rotulo = playerId === sessao.playerId ? "Voce" : "Seu adversario";
    adicionarLog(`${rotulo} perdeu a conexao. Janela de reconexao: ${Math.ceil(reconnectGraceMs / 1000)}s.`);
  });

  socketPartida.on("game-over", ({ winnerPlayerId, reason }) => {
    adicionarLog(winnerPlayerId === sessao.playerId ? `Voce venceu. Motivo: ${reason}.` : `Voce perdeu. Motivo: ${reason}.`);
  });

  socketPartida.on("join-error", ({ message }) => {
    adicionarLog(message);
    atualizarFaixaTurno("waiting", message);
    iniciarRecuperacao();
  });
}

async function restaurarPartida() {
  if (!sessao?.playerId || !sessao?.reconnectToken) {
    window.location.href = "/";
    return;
  }

  try {
    const resposta = await fetch(`/session/${sessao.playerId}?token=${sessao.reconnectToken}&t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) {
      localStorage.removeItem(chaveSessao);
      localStorage.removeItem(chavePartida);
      window.location.href = "/";
      return;
    }

    const estadoServidor = await resposta.json();
    if (!estadoServidor.gameId || !estadoServidor.serverUrl) {
      localStorage.removeItem(chavePartida);
      window.location.href = "/";
      return;
    }

    atualizarDadosPartida({
      gameId: estadoServidor.gameId,
      serverUrl: estadoServidor.serverUrl,
      serverId: estadoServidor.serverId
    });
    conectarNaPartida();
  } catch {
    atualizarFaixaTurno("waiting", "Nao foi possivel restaurar a partida.");
  }
}

formularioPalpite.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const letra = campoPalpite.value.trim().toLowerCase();
  campoPalpite.value = "";
  if (!letra || !socketPartida || !estadoAtual) {
    return;
  }

  socketPartida.emit("guess-letter", {
    gameId: estadoAtual.gameId,
    playerId: sessao.playerId,
    letter: letra
  });
});

socketController.on("connect", () => {
  if (!sessao?.playerId || !sessao?.reconnectToken) {
    return;
  }

  socketController.emit("join-lobby", {
    playerId: sessao.playerId,
    reconnectToken: sessao.reconnectToken,
    playerName: sessao.playerName || "Jogador"
  });
});

socketController.on("match-found", (payload) => {
  const servidorMudou = payload.serverUrl && payload.serverUrl !== dadosPartida?.serverUrl;
  atualizarDadosPartida({
    gameId: payload.gameId,
    serverUrl: payload.serverUrl,
    serverId: payload.serverId
  });

  if (payload.migrated) {
    adicionarLog(`Controller informou migracao da partida para ${payload.serverId || payload.serverUrl}.`);
  }

  if (payload.migrated || servidorMudou || !socketPartida || !socketPartida.connected) {
    conectarNaPartida();
  }
});

renderizarForca([]);
campoPalpite.disabled = true;
formularioPalpite.querySelector("button").disabled = true;
restaurarPartida();

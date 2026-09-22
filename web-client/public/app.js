const formularioEntrada = document.querySelector("#join-form");
const campoNomeJogador = document.querySelector("#player-name");
const painelLobby = document.querySelector("#lobby-panel");
const textoStatusFila = document.querySelector("#queue-status");
const textoPosicaoFila = document.querySelector("#queue-position");
const seloServidor = document.querySelector("#server-badge");
const tituloPartida = document.querySelector("#game-title");
const subtituloPartida = document.querySelector("#game-subtitle");
const faixaTurno = document.querySelector("#turn-banner");
const palavraMascarada = document.querySelector("#masked-word");
const textoDica = document.querySelector("#hint");
const letrasErradas = document.querySelector("#wrong-letters");
const containerJogadores = document.querySelector("#players");
const formularioPalpite = document.querySelector("#guess-form");
const campoPalpite = document.querySelector("#guess-input");
const listaEventos = document.querySelector("#event-log");

const chaveSessao = "forca-distribuida-session";
const socketController = io({ autoConnect: false });
let socketPartida = null;
let sessao = carregarSessao();
let estadoAtual = null;
const statusLobbyDesconectado = "Conecte-se para entrar na fila de pareamento.";

function carregarSessao() {
  try {
    return JSON.parse(localStorage.getItem(chaveSessao) || "null");
  } catch {
    return null;
  }
}

function salvarSessao(proximaSessao) {
  sessao = proximaSessao;
  localStorage.setItem(chaveSessao, JSON.stringify(proximaSessao));
}

function adicionarLog(mensagem) {
  if (!listaEventos) {
    return;
  }
  const item = document.createElement("li");
  item.textContent = `[${new Date().toLocaleTimeString()}] ${mensagem}`;
  listaEventos.prepend(item);
}

function renderizarForca(partes) {
  document.querySelectorAll(".part").forEach((elemento) => {
    const estaVisivel = partes.includes(elemento.dataset.part);
    elemento.classList.toggle("visible", estaVisivel);
  });
}

function atualizarFaixaTurno(tipo, mensagem) {
  faixaTurno.className = `turn-banner ${tipo}`;
  faixaTurno.textContent = mensagem;
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

function renderizarEstadoLobby({ titulo, subtitulo, textoFila, textoPosicao, selo, tipoFaixa, mensagemFaixa, conectado }) {
  tituloPartida.textContent = titulo;
  subtituloPartida.textContent = subtitulo;
  textoStatusFila.textContent = textoFila;
  textoPosicaoFila.textContent = textoPosicao;
  seloServidor.textContent = selo;
  atualizarFaixaTurno(tipoFaixa, mensagemFaixa);
  formularioEntrada.querySelector("button").disabled = conectado;
  campoNomeJogador.disabled = conectado;
  campoPalpite.disabled = true;
  formularioPalpite.querySelector("button").disabled = true;
}

function renderizarEstadoPartida(estado) {
  estadoAtual = estado;
  painelLobby.classList.add("hidden");
  seloServidor.textContent = estado.serverId;
  tituloPartida.textContent = "Partida em andamento";
  subtituloPartida.textContent = estado.status === "finished"
    ? "Partida encerrada"
    : `Vez de ${estado.currentTurnPlayerName || "aguardar"}`;
  palavraMascarada.textContent = estado.maskedWord;
  textoDica.textContent = `Dica: ${estado.hint}`;
  letrasErradas.textContent = estado.wrongLetters.length ? estado.wrongLetters.join(", ").toUpperCase() : "Nenhuma";
  renderizarForca(estado.hangmanPartsDrawn);
  renderizarJogadores(estado);

  const visualizador = estado.players.find((jogador) => jogador.playerId === estado.viewerPlayerId);
  const podeJogar = estado.status === "playing" && visualizador && visualizador.isTurn && visualizador.connected;
  campoPalpite.disabled = !podeJogar;
  formularioPalpite.querySelector("button").disabled = !podeJogar;

  if (estado.status === "finished") {
    if (estado.winnerPlayerId === estado.viewerPlayerId) {
      atualizarFaixaTurno("finished", "Partida encerrada. Voce venceu.");
    } else {
      atualizarFaixaTurno("finished", "Partida encerrada. Voce perdeu.");
    }
  } else if (podeJogar) {
    atualizarFaixaTurno("active", "Sua vez de jogar. Escolha uma letra.");
    campoPalpite.focus();
  } else {
    atualizarFaixaTurno("idle", `Aguarde. Agora e a vez de ${estado.currentTurnPlayerName || "seu adversario"}.`);
  }
}

function conectarNaPartida(informacoesPartida) {
  if (socketPartida) {
    socketPartida.disconnect();
  }

  renderizarEstadoLobby({
    titulo: "Partida encontrada",
    subtitulo: `Conectando contra ${informacoesPartida.opponentName || "oponente"}.`,
    textoFila: "Partida criada. Entrando no servidor de jogo.",
    textoPosicao: "",
    selo: "Conectando",
    tipoFaixa: "waiting",
    mensagemFaixa: "Conectando ao servidor da partida...",
    conectado: true
  });

  socketPartida = io(informacoesPartida.serverUrl, { transports: ["websocket", "polling"] });
  adicionarLog(`Conectando ao servidor ${informacoesPartida.serverUrl}.`);

  socketPartida.on("connect", () => {
    socketPartida.emit("join-game", {
      gameId: informacoesPartida.gameId,
      playerId: informacoesPartida.playerId,
      reconnectToken: informacoesPartida.reconnectToken
    });
  });

  socketPartida.on("joined-game", ({ serverId }) => {
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
    if (winnerPlayerId === sessao.playerId) {
      adicionarLog(`Voce venceu. Motivo: ${reason}.`);
    } else {
      adicionarLog(`Voce perdeu. Motivo: ${reason}.`);
    }
  });

  socketPartida.on("join-error", ({ message }) => {
    adicionarLog(message);
    atualizarFaixaTurno("waiting", message);
  });
}

async function restaurarSessaoExistente() {
  if (!sessao?.playerId || !sessao?.reconnectToken) {
    return;
  }

  try {
    const resposta = await fetch(`/session/${sessao.playerId}?token=${sessao.reconnectToken}`);
    if (!resposta.ok) {
      localStorage.removeItem(chaveSessao);
      sessao = null;
      return;
    }

    const sessaoServidor = await resposta.json();
    campoNomeJogador.value = sessaoServidor.playerName || sessao.playerName || "";
    socketController.emit("join-lobby", {
      playerId: sessao.playerId,
      reconnectToken: sessao.reconnectToken,
      playerName: sessaoServidor.playerName || sessao.playerName
    });

    if (sessaoServidor.status === "assigned" || sessaoServidor.status === "playing") {
      conectarNaPartida({
        ...sessaoServidor,
        reconnectToken: sessao.reconnectToken,
        playerId: sessao.playerId
      });
    } else {
      renderizarEstadoLobby({
        titulo: "Reconectando ao lobby",
        subtitulo: "Sua sessao anterior foi encontrada.",
        textoFila: "Restaurando sua posicao na fila.",
        textoPosicao: "",
        selo: "Lobby",
        tipoFaixa: "waiting",
        mensagemFaixa: "Reconectando ao controller...",
        conectado: true
      });
    }
  } catch {
    adicionarLog("Nao foi possivel restaurar a sessao anterior.");
  }
}

formularioEntrada.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nomeJogador = campoNomeJogador.value.trim();
  if (!nomeJogador) {
    return;
  }

  socketController.emit("join-lobby", {
    playerName: nomeJogador,
    playerId: sessao?.playerId,
    reconnectToken: sessao?.reconnectToken
  });
  renderizarEstadoLobby({
    titulo: "Buscando partida",
    subtitulo: `Jogador conectado: ${nomeJogador}`,
    textoFila: "Solicitando entrada no controller.",
    textoPosicao: "",
    selo: "Lobby",
    tipoFaixa: "waiting",
    mensagemFaixa: "Aguardando confirmacao do controller...",
    conectado: true
  });
  adicionarLog(`Solicitando conexao para ${nomeJogador}.`);
});

socketController.on("lobby-joined", (payload) => {
  salvarSessao({
    playerId: payload.playerId,
    playerName: payload.playerName,
    reconnectToken: payload.reconnectToken
  });
  campoNomeJogador.value = payload.playerName;
  renderizarEstadoLobby({
    titulo: "Buscando partida",
    subtitulo: "Voce esta no lobby distribuido.",
    textoFila: "Voce entrou na fila de pareamento.",
    textoPosicao: "",
    selo: "Lobby",
    tipoFaixa: "waiting",
    mensagemFaixa: "Aguardando adversario.",
    conectado: true
  });
  adicionarLog("Sessao criada no controller.");
});

socketController.on("queue-update", ({ position, waitingCount }) => {
  textoStatusFila.textContent = waitingCount > 1 ? "Aguardando adversario e disponibilidade." : "Aguardando o proximo jogador.";
  textoPosicaoFila.textContent = position ? `Posicao atual na fila: ${position}` : "";
  atualizarFaixaTurno("waiting", position === 1
    ? "Voce esta no topo da fila. Aguardando outro jogador."
    : `Voce esta na fila de espera. Posicao atual: ${position}.`);
});

socketController.on("match-found", (payload) => {
  salvarSessao({
    playerId: payload.playerId,
    reconnectToken: payload.reconnectToken,
    playerName: sessao?.playerName || campoNomeJogador.value.trim()
  });
  textoStatusFila.textContent = `Partida encontrada contra ${payload.opponentName || "oponente"}.`;
  textoPosicaoFila.textContent = "";
  adicionarLog(`Match encontrado. Adversario: ${payload.opponentName || "indefinido"}.`);
  conectarNaPartida(payload);
});

socketController.on("join-error", ({ message }) => {
  renderizarEstadoLobby({
    titulo: "Painel da partida",
    subtitulo: "Escolha um nome diferente para procurar um adversario.",
    textoFila: message || "Esse nome ja esta em uso.",
    textoPosicao: "",
    selo: "Lobby",
    tipoFaixa: "waiting",
    mensagemFaixa: "Nao foi possivel entrar na fila.",
    conectado: false
  });
  adicionarLog(message || "Tentativa de entrada rejeitada por nome duplicado.");
});

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

renderizarEstadoLobby({
  titulo: "Painel da partida",
  subtitulo: "Entre com seu nome para procurar um adversario.",
  textoFila: statusLobbyDesconectado,
  textoPosicao: "",
  selo: "Lobby",
  tipoFaixa: "waiting",
  mensagemFaixa: "Aguardando entrada no jogo.",
  conectado: false
});
renderizarForca([]);
socketController.connect();
restaurarSessaoExistente();

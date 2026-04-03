const formularioEntrada = document.querySelector("#join-form");
const campoNomeJogador = document.querySelector("#player-name");
const textoStatusFila = document.querySelector("#queue-status");
const textoPosicaoFila = document.querySelector("#queue-position");
const subtituloLobby = document.querySelector("#lobby-subtitle");
const faixaLobby = document.querySelector("#lobby-banner");
const seloLobby = document.querySelector("#lobby-badge");
const listaEventos = document.querySelector("#event-log");

const chaveSessao = "forca-distribuida-session";
const chavePartida = "forca-distribuida-match";
const socketController = io();
let sessao = carregarJson(chaveSessao);

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

function atualizarLobby(tipo, faixa, subtitulo, status, textoPosicao, conectado) {
  faixaLobby.className = `turn-banner ${tipo}`;
  faixaLobby.textContent = faixa;
  subtituloLobby.textContent = subtitulo;
  textoStatusFila.textContent = status;
  textoPosicaoFila.textContent = textoPosicao;
  seloLobby.textContent = conectado ? "Conectado" : "Lobby";
  campoNomeJogador.disabled = conectado;
  formularioEntrada.querySelector("button").disabled = conectado;
}

async function restaurarSessao() {
  if (!sessao?.playerId || !sessao?.reconnectToken) {
    return;
  }

  try {
    const resposta = await fetch(`/session/${sessao.playerId}?token=${sessao.reconnectToken}&t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) {
      localStorage.removeItem(chaveSessao);
      localStorage.removeItem(chavePartida);
      sessao = null;
      return;
    }

    const estadoAtual = await resposta.json();
    campoNomeJogador.value = estadoAtual.playerName || sessao.playerName || "";
    socketController.emit("join-lobby", {
      playerId: sessao.playerId,
      reconnectToken: sessao.reconnectToken,
      playerName: estadoAtual.playerName || sessao.playerName
    });

    if (estadoAtual.status === "assigned" || estadoAtual.status === "playing") {
      salvarJson(chavePartida, {
        gameId: estadoAtual.gameId,
        playerId: sessao.playerId,
        reconnectToken: sessao.reconnectToken,
        serverUrl: estadoAtual.serverUrl
      });
      window.location.href = "/game.html";
      return;
    }

    atualizarLobby("waiting", "Reconectando ao lobby...", "Sua sessao anterior foi encontrada.", "Restaurando sua posicao na fila.", "", true);
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
  atualizarLobby("waiting", "Aguardando confirmacao do controller...", `Jogador conectado: ${nomeJogador}`, "Solicitando entrada no controller.", "", true);
  adicionarLog(`Solicitando conexao para ${nomeJogador}.`);
});

socketController.on("lobby-joined", (payload) => {
  sessao = {
    playerId: payload.playerId,
    playerName: payload.playerName,
    reconnectToken: payload.reconnectToken
  };
  salvarJson(chaveSessao, sessao);
  campoNomeJogador.value = payload.playerName;
  atualizarLobby("waiting", "Aguardando adversario.", "Voce esta no lobby distribuido.", "Voce entrou na fila de pareamento.", "", true);
  adicionarLog("Sessao criada no controller.");
});

socketController.on("queue-update", ({ position, waitingCount }) => {
  const faixa = position === 1
    ? "Voce esta no topo da fila. Aguardando outro jogador."
    : `Voce esta na fila de espera. Posicao atual: ${position}.`;
  atualizarLobby("waiting", faixa, "Voce esta no lobby distribuido.", waitingCount > 1 ? "Aguardando adversario e disponibilidade." : "Aguardando o proximo jogador.", position ? `Posicao atual na fila: ${position}` : "", true);
});

socketController.on("match-found", (payload) => {
  sessao = {
    playerId: payload.playerId,
    reconnectToken: payload.reconnectToken,
    playerName: sessao?.playerName || campoNomeJogador.value.trim()
  };
  salvarJson(chaveSessao, sessao);
  salvarJson(chavePartida, payload);
  adicionarLog(`Match encontrado. Adversario: ${payload.opponentName || "indefinido"}.`);
  window.location.href = "/game.html";
});

atualizarLobby("waiting", "Aguardando entrada no jogo.", "Conecte-se ao controller para procurar um adversario.", "Nenhum jogador conectado ainda.", "", false);
restaurarSessao();

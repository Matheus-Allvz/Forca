const formularioEntrada = document.querySelector("#join-form");
const campoNomeJogador = document.querySelector("#player-name");
const textoFilaPublica = document.querySelector("#public-queue-status");
const textoStatusFila = document.querySelector("#queue-status");
const textoPosicaoFila = document.querySelector("#queue-position");
const botaoSairFila = document.querySelector("#leave-queue-button");
const subtituloLobby = document.querySelector("#lobby-subtitle");
const faixaLobby = document.querySelector("#lobby-banner");
const seloLobby = document.querySelector("#lobby-badge");
const listaEventos = document.querySelector("#event-log");
const corpoRanking = document.querySelector("#ranking-body");
const textoAtualizacaoRanking = document.querySelector("#ranking-last-update");

const chaveSessao = "forca-distribuida-session";
const chavePartida = "forca-distribuida-match";
const chaveNomePreferido = "forca-distribuida-preferred-name";
const socketController = io({ autoConnect: false });
let sessao = carregarJson(chaveSessao);
let deveEntrarDiretoNaFila = new URLSearchParams(window.location.search).get("playAgain") === "1";
const statusLobbyDesconectado = "Conecte-se para entrar na fila de pareamento.";

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

function preencherNomePreferido() {
  if (sessao?.playerName) {
    campoNomeJogador.value = sessao.playerName;
    return;
  }

  const nomePreferido = localStorage.getItem(chaveNomePreferido);
  if (nomePreferido) {
    campoNomeJogador.value = nomePreferido;
  }
}

function consumirModoJogarNovamente() {
  if (!deveEntrarDiretoNaFila) {
    return;
  }

  deveEntrarDiretoNaFila = false;
  const urlLimpa = new URL(window.location.href);
  urlLimpa.searchParams.delete("playAgain");
  window.history.replaceState({}, "", urlLimpa.pathname + urlLimpa.search + urlLimpa.hash);
}

function entrarDiretoNaFilaSePossivel() {
  if (!deveEntrarDiretoNaFila || sessao?.playerId) {
    return;
  }

  const nomeJogador = campoNomeJogador.value.trim();
  if (!nomeJogador) {
    consumirModoJogarNovamente();
    return;
  }

  socketController.emit("join-lobby", { playerName: nomeJogador });
  atualizarLobby("waiting", "Entrando novamente na fila...", `Jogador conectado: ${nomeJogador}`, "Solicitando nova entrada no controller.", "", true);
  consumirModoJogarNovamente();
}

function adicionarLog(mensagem) {
  if (!listaEventos) {
    return;
  }
  const item = document.createElement("li");
  item.textContent = `[${new Date().toLocaleTimeString()}] ${mensagem}`;
  listaEventos.prepend(item);
}

function renderizarRanking(jogadores) {
  if (!corpoRanking) {
    return;
  }

  if (!jogadores.length) {
    corpoRanking.innerHTML = `<tr><td colspan="6">Nenhum jogador registrado ainda.</td></tr>`;
    return;
  }

  corpoRanking.innerHTML = jogadores.slice(0, 10).map((jogador, indice) => `
    <tr>
      <td>${indice + 1}</td>
      <td>${jogador.playerName}</td>
      <td>${jogador.wins}</td>
      <td>${jogador.losses}</td>
      <td>${jogador.games}</td>
      <td>${jogador.winRate}%</td>
    </tr>
  `).join("");
}

async function carregarRanking() {
  if (!corpoRanking) {
    return;
  }

  try {
    const resposta = await fetch(`/ranking?t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) {
      throw new Error("ranking indisponivel");
    }

    const payload = await resposta.json();
    renderizarRanking(payload.players || []);
    textoAtualizacaoRanking.textContent = `Atualizado as ${new Date().toLocaleTimeString()}`;
  } catch {
    corpoRanking.innerHTML = `<tr><td colspan="6">Nao foi possivel carregar o ranking.</td></tr>`;
    textoAtualizacaoRanking.textContent = "Falha ao atualizar o ranking.";
  }
}

function renderizarFilaPublica(quantidade) {
  if (!textoFilaPublica) {
    return;
  }

  if (quantidade <= 0) {
    textoFilaPublica.textContent = "Fila publica: ninguem aguardando no momento.";
    return;
  }

  if (quantidade === 1) {
    textoFilaPublica.textContent = "Fila publica: 1 jogador aguardando pareamento.";
    return;
  }

  textoFilaPublica.textContent = `Fila publica: ${quantidade} jogadores aguardando pareamento.`;
}

async function carregarFilaPublica() {
  if (!textoFilaPublica) {
    return;
  }

  try {
    const resposta = await fetch(`/health?t=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) {
      throw new Error("fila indisponivel");
    }

    const payload = await resposta.json();
    renderizarFilaPublica(Number(payload.waitingPlayers || 0));
  } catch {
    textoFilaPublica.textContent = "Fila publica indisponivel no momento.";
  }
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
  if (botaoSairFila) {
    botaoSairFila.disabled = !conectado;
  }
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
  localStorage.setItem(chaveNomePreferido, nomeJogador);
  atualizarLobby("waiting", "Aguardando confirmacao do controller...", `Jogador conectado: ${nomeJogador}`, "Solicitando entrada no controller.", "", true);
  adicionarLog(`Solicitando conexao para ${nomeJogador}.`);
});

botaoSairFila?.addEventListener("click", () => {
  if (!sessao?.playerId || !sessao?.reconnectToken) {
    return;
  }

  socketController.emit("leave-queue", {
    playerId: sessao.playerId,
    reconnectToken: sessao.reconnectToken
  });
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
  carregarRanking();
  carregarFilaPublica();
});

socketController.on("queue-update", ({ position, waitingCount }) => {
  const faixa = position === 1
    ? "Voce esta no topo da fila. Aguardando outro jogador."
    : `Voce esta na fila de espera. Posicao atual: ${position}.`;
  atualizarLobby("waiting", faixa, "Voce esta no lobby distribuido.", waitingCount > 1 ? "Aguardando adversario e disponibilidade." : "Aguardando o proximo jogador.", position ? `Posicao atual na fila: ${position}` : "", true);
  renderizarFilaPublica(Number(waitingCount || 0));
});

socketController.on("queue-public-update", ({ waitingCount }) => {
  renderizarFilaPublica(Number(waitingCount || 0));
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

socketController.on("queue-left", ({ message }) => {
  localStorage.removeItem(chaveSessao);
  localStorage.removeItem(chavePartida);
  sessao = null;
  campoNomeJogador.value = "";
  atualizarLobby("waiting", "Voce saiu da fila.", "Conecte-se ao controller para procurar um adversario.", message || statusLobbyDesconectado, "", false);
  preencherNomePreferido();
  carregarFilaPublica();
});

socketController.on("join-error", ({ message }) => {
  atualizarLobby(
    "waiting",
    "Nao foi possivel entrar na fila.",
    "Escolha um nome diferente para continuar.",
    message || "Esse nome ja esta em uso.",
    "",
    false
  );
  adicionarLog(message || "Tentativa de entrada rejeitada por nome duplicado.");
  preencherNomePreferido();
});

atualizarLobby("waiting", "Aguardando entrada no jogo.", "Conecte-se ao controller para procurar um adversario.", statusLobbyDesconectado, "", false);
preencherNomePreferido();
socketController.connect();
entrarDiretoNaFilaSePossivel();
carregarFilaPublica();
carregarRanking();
setInterval(carregarFilaPublica, 10000);
setInterval(carregarRanking, 10000);
restaurarSessao();

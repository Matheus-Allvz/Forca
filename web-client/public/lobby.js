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
const containerPodium = document.querySelector("#podium-container");
const textoAtualizacaoRanking = document.querySelector("#ranking-last-update");
const botaoTema = document.querySelector("#theme-toggle");
const botaoSom = document.querySelector("#sound-toggle");
const botaoNomeAleatorio = document.querySelector("#random-name-btn");
const graficoRadar = document.querySelector("#radar-graphic");

const chaveSessao = "forca-distribuida-session";
const chavePartida = "forca-distribuida-match";
const chaveNomePreferido = "forca-distribuida-preferred-name";
const chaveTema = "forca-distribuida-theme";
const chaveSom = "forca-distribuida-sound";

// Web Audio API Sound System
class SoundFx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(chaveSom) === "true";
    this.atualizarBotaoSom();
  }

  init() {
    if (!this.ctx && typeof AudioContext !== "undefined") {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem(chaveSom, String(this.muted));
    this.atualizarBotaoSom();
    if (!this.muted) {
      this.playBeep(523.25, 0.1);
    }
    return this.muted;
  }

  atualizarBotaoSom() {
    if (botaoSom) {
      botaoSom.textContent = this.muted ? "🔇" : "🔊";
      botaoSom.title = this.muted ? "Ativar efeitos sonoros" : "Silenciar sons";
    }
  }

  playBeep(freq, duracao = 0.15, gainVal = 0.08) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duracao);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duracao);
    } catch {
      // Ignora erro de autoplay restrito
    }
  }

  matchFound() {
    // Fanfarra alegre de partida encontrada
    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((freq, idx) => {
      setTimeout(() => this.playBeep(freq, 0.25, 0.12), idx * 110);
    });
  }
}

const som = new SoundFx();

// Gerenciamento de Tema (Claro / Escuro)
function inicializarTema() {
  const temaSalvo = localStorage.getItem(chaveTema) || "dark";
  document.documentElement.setAttribute("data-theme", temaSalvo);
  atualizarBotaoTema(temaSalvo);
}

function atualizarBotaoTema(tema) {
  if (botaoTema) {
    botaoTema.textContent = tema === "dark" ? "🌙" : "☀️";
    botaoTema.title = tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro";
  }
}

function alternarTema() {
  const temaAtual = document.documentElement.getAttribute("data-theme") || "dark";
  const proximoTema = temaAtual === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", proximoTema);
  localStorage.setItem(chaveTema, proximoTema);
  atualizarBotaoTema(proximoTema);
}

botaoTema?.addEventListener("click", alternarTema);
botaoSom?.addEventListener("click", () => som.toggle());

// Gerador de apelidos divertidos
const prefixos = ["Cyber", "Pixel", "Mago", "Ninja", "Turbo", "Vortex", "Quantum", "Shadow", "Alpha", "Hyper"];
const sufixos = ["Gamer", "Dev", "Coder", "Forca", "Player", "Knight", "Master", "Runner", "Hunter", "Lord"];

function gerarApelidoAleatorio() {
  const pref = prefixos[Math.floor(Math.random() * prefixos.length)];
  const suf = sufixos[Math.floor(Math.random() * sufixos.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  const apelido = `${pref}${suf}${num}`;
  campoNomeJogador.value = apelido;
  campoNomeJogador.focus();
  som.playBeep(440, 0.08);
}

botaoNomeAleatorio?.addEventListener("click", gerarApelidoAleatorio);

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

function renderizarPodium(jogadores) {
  if (!containerPodium) return;

  if (!jogadores || jogadores.length === 0) {
    containerPodium.innerHTML = "";
    containerPodium.classList.add("hidden");
    return;
  }

  containerPodium.classList.remove("hidden");
  const medalhas = ["🥇", "🥈", "🥉"];
  const classes = ["gold", "silver", "bronze"];
  const rotulos = ["1º Lugar", "2º Lugar", "3º Lugar"];

  const top3 = jogadores.slice(0, 3);
  containerPodium.innerHTML = top3.map((jogador, index) => `
    <article class="podium-card ${classes[index]}">
      <div class="podium-rank">${medalhas[index]}</div>
      <div class="podium-name">${jogador.playerName}</div>
      <div class="podium-stats">${jogador.wins} vitórias • ${jogador.games} partidas</div>
      <div class="podium-badge">${jogador.winRate}% de vitórias</div>
    </article>
  `).join("");
}

function renderizarRanking(jogadores) {
  if (!corpoRanking) {
    return;
  }

  renderizarPodium(jogadores);

  if (!jogadores.length) {
    corpoRanking.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Nenhum jogador registrado ainda. Seja o primeiro a disputar uma partida!</td></tr>`;
    return;
  }

  corpoRanking.innerHTML = jogadores.slice(0, 10).map((jogador, indice) => {
    const winRate = Number(jogador.winRate) || 0;
    const isCurrentUser = sessao?.playerName && sessao.playerName === jogador.playerName;
    return `
      <tr style="${isCurrentUser ? 'background: rgba(99, 102, 241, 0.12); font-weight: 700;' : ''}">
        <td><strong>#${indice + 1}</strong></td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 8px;">
            ${jogador.playerName}
            ${isCurrentUser ? '<span class="badge" style="font-size: 0.65rem; padding: 2px 6px;">Você</span>' : ''}
          </span>
        </td>
        <td style="text-align: center;"><span style="color: var(--accent-emerald); font-weight: 700;">${jogador.wins}</span></td>
        <td style="text-align: center;"><span style="color: var(--accent-rose); font-weight: 700;">${jogador.losses}</span></td>
        <td style="text-align: center;">${jogador.games}</td>
        <td>
          <div style="display: flex; align-items: center;">
            <div class="win-rate-bar-container">
              <div class="win-rate-bar-fill" style="width: ${winRate}%;"></div>
            </div>
            <span>${winRate}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join("");
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
    if (textoAtualizacaoRanking) {
      textoAtualizacaoRanking.textContent = `Atualizado às ${new Date().toLocaleTimeString()}`;
    }
  } catch {
    corpoRanking.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--accent-rose);">Não foi possível carregar o ranking.</td></tr>`;
    if (textoAtualizacaoRanking) {
      textoAtualizacaoRanking.textContent = "Falha ao atualizar o ranking.";
    }
  }
}

function renderizarFilaPublica(quantidade) {
  if (!textoFilaPublica) {
    return;
  }

  if (quantidade <= 0) {
    textoFilaPublica.innerHTML = `🟢 <strong>Fila pública:</strong> nenhum oponente aguardando no momento.`;
    return;
  }

  if (quantidade === 1) {
    textoFilaPublica.innerHTML = `⚡ <strong>Fila pública:</strong> 1 jogador pronto para pareamento!`;
    return;
  }

  textoFilaPublica.innerHTML = `⚡ <strong>Fila pública:</strong> ${quantidade} jogadores aguardando pareamento.`;
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
    textoFilaPublica.textContent = "Fila pública temporariamente indisponível.";
  }
}

function atualizarLobby(tipo, faixa, subtitulo, status, textoPosicao, conectado) {
  if (faixaLobby) {
    faixaLobby.className = `turn-banner ${tipo}`;
    faixaLobby.innerHTML = `<span>${faixa}</span>`;
  }
  if (subtituloLobby) subtituloLobby.textContent = subtitulo;
  if (textoStatusFila) textoStatusFila.textContent = status;
  if (textoPosicaoFila) textoPosicaoFila.textContent = textoPosicao;
  if (seloLobby) {
    seloLobby.textContent = conectado ? "🟢 Conectado" : "Lobby";
    seloLobby.className = conectado ? "badge online" : "badge";
  }
  if (campoNomeJogador) campoNomeJogador.disabled = conectado;
  if (botaoNomeAleatorio) botaoNomeAleatorio.disabled = conectado;
  
  const submitBtn = formularioEntrada?.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.disabled = conectado;

  if (botaoSairFila) {
    botaoSairFila.disabled = !conectado;
  }

  if (graficoRadar) {
    graficoRadar.style.display = conectado ? "grid" : "none";
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

    atualizarLobby("waiting", "Reconectando ao lobby...", "Sua sessão anterior foi encontrada.", "Restaurando sua posição na fila.", "", true);
  } catch {
    adicionarLog("Não foi possível restaurar a sessão anterior.");
  }
}

formularioEntrada.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nomeJogador = campoNomeJogador.value.trim();
  if (!nomeJogador) {
    return;
  }

  som.playBeep(600, 0.1);
  socketController.emit("join-lobby", {
    playerName: nomeJogador,
    playerId: sessao?.playerId,
    reconnectToken: sessao?.reconnectToken
  });
  localStorage.setItem(chaveNomePreferido, nomeJogador);
  atualizarLobby("waiting", "Aguardando confirmação do controller...", `Jogador conectado: ${nomeJogador}`, "Solicitando entrada no controller...", "", true);
  adicionarLog(`Solicitando conexão para ${nomeJogador}.`);
});

botaoSairFila?.addEventListener("click", () => {
  if (!sessao?.playerId || !sessao?.reconnectToken) {
    return;
  }

  som.playBeep(300, 0.1);
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
  atualizarLobby("waiting", "🔍 Buscando adversário...", "Você está no lobby distribuído.", "Você entrou na fila de pareamento.", "", true);
  adicionarLog("Sessão criada no controller.");
  carregarRanking();
  carregarFilaPublica();
});

socketController.on("queue-update", ({ position, waitingCount }) => {
  const faixa = position === 1
    ? "🎯 Você está no topo da fila! Aguardando oponente..."
    : `⏳ Você está na fila de espera. Posição atual: #${position}.`;
  atualizarLobby(
    "waiting",
    faixa,
    "Você está no lobby distribuído.",
    waitingCount > 1 ? "Aguardando adversário e nó de servidor disponível..." : "Aguardando o próximo jogador entrar...",
    position ? `Posição atual na fila: #${position}` : "",
    true
  );
  renderizarFilaPublica(Number(waitingCount || 0));
});

socketController.on("queue-public-update", ({ waitingCount }) => {
  renderizarFilaPublica(Number(waitingCount || 0));
});

socketController.on("match-found", (payload) => {
  som.matchFound();
  sessao = {
    playerId: payload.playerId,
    reconnectToken: payload.reconnectToken,
    playerName: sessao?.playerName || campoNomeJogador.value.trim()
  };
  salvarJson(chaveSessao, sessao);
  salvarJson(chavePartida, payload);
  adicionarLog(`Match encontrado! Adversário: ${payload.opponentName || "indefinido"}. Redirecionando...`);
  
  if (faixaLobby) {
    faixaLobby.className = "turn-banner active";
    faixaLobby.innerHTML = `<span>🎮 Partida encontrada contra <strong>${payload.opponentName || "Adversário"}</strong>! Carregando...</span>`;
  }
  
  setTimeout(() => {
    window.location.href = "/game.html";
  }, 750);
});

socketController.on("queue-left", ({ message }) => {
  localStorage.removeItem(chaveSessao);
  localStorage.removeItem(chavePartida);
  sessao = null;
  campoNomeJogador.value = "";
  atualizarLobby("waiting", "Você saiu da fila.", "Conecte-se ao controller para procurar um adversário.", message || statusLobbyDesconectado, "", false);
  preencherNomePreferido();
  carregarFilaPublica();
});

socketController.on("join-error", ({ message }) => {
  atualizarLobby(
    "waiting",
    "Não foi possível entrar na fila.",
    "Escolha um apelido diferente para continuar.",
    message || "Esse apelido já está em uso.",
    "",
    false
  );
  adicionarLog(message || "Tentativa de entrada rejeitada.");
  preencherNomePreferido();
});

// Inicialização
inicializarTema();
atualizarLobby("waiting", "Aguardando entrada no jogo.", "Conecte-se ao controller para procurar um adversário.", statusLobbyDesconectado, "", false);
preencherNomePreferido();
socketController.connect();
entrarDiretoNaFilaSePossivel();
carregarFilaPublica();
carregarRanking();
setInterval(carregarFilaPublica, 10000);
setInterval(carregarRanking, 10000);
restaurarSessao();

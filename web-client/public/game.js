const tituloPartida = document.querySelector("#game-title");
const subtituloPartida = document.querySelector("#game-subtitle");
const seloServidor = document.querySelector("#server-badge");
const faixaTurno = document.querySelector("#turn-banner");
const mensagemTurno = document.querySelector("#turn-message");
const seloContadorTurno = document.querySelector("#turn-countdown-badge");
const barraProgressoTurno = document.querySelector("#turn-timer-bar");
const palavraMascarada = document.querySelector("#masked-word");
const temaPartida = document.querySelector("#theme");
const badgeDificuldade = document.querySelector("#difficulty-badge");
const letrasErradas = document.querySelector("#wrong-letters");
const containerJogadores = document.querySelector("#players");
const formularioPalpite = document.querySelector("#guess-form");
const campoPalpite = document.querySelector("#guess-input");
const listaEventos = document.querySelector("#event-log");
const botaoDesistir = document.querySelector("#surrender-button");
const acoesPosJogo = document.querySelector("#post-game-actions");
const botaoJogarNovamente = document.querySelector("#play-again-button");
const botaoVoltarLobby = document.querySelector("#return-lobby-button");
const legendaForca = document.querySelector("#gallows-caption-me") || document.querySelector("#gallows-caption");
const estagioForca = document.querySelector("#gallows-stage-me") || document.querySelector("#gallows-stage");

// Elementos da Arena de Duelo (Duas Forcas e Semáforo)
const estagioForcaMe = document.querySelector("#gallows-stage-me");
const estagioForcaOpponent = document.querySelector("#gallows-stage-opponent");
const legendaForcaMe = document.querySelector("#gallows-caption-me");
const legendaForcaOpponent = document.querySelector("#gallows-caption-opponent");
const nomePlayerMe = document.querySelector("#name-player-me");
const nomePlayerOpponent = document.querySelector("#name-player-opponent");
const cardPlayerMe = document.querySelector("#card-player-me");
const cardPlayerOpponent = document.querySelector("#card-player-opponent");
const semaforoBadgeMe = document.querySelector("#semaphore-me");
const semaforoBadgeOpponent = document.querySelector("#semaphore-opponent");
const semaforoTextMe = document.querySelector("#semaphore-text-me");
const semaforoTextOpponent = document.querySelector("#semaphore-text-opponent");
const lightRed = document.querySelector("#light-red");
const lightYellow = document.querySelector("#light-yellow");
const lightGreen = document.querySelector("#light-green");
const semaforoSublabel = document.querySelector("#semaphore-sublabel");

// Elementos do HUD de Combate (Estatísticas em Tempo Real)
const statAccuracy = document.querySelector("#stat-accuracy");
const statAvgTime = document.querySelector("#stat-avg-time");
const statStreak = document.querySelector("#stat-streak");
const statStreakIcon = document.querySelector("#stat-streak-icon");
const statDuration = document.querySelector("#stat-duration");

// Elementos do Sistema de Dica por Consenso 2/2
const cardDicaConsenso = document.querySelector("#hint-consensus-card");
const badgeStatusDica = document.querySelector("#hint-status-badge");
const botaoDica = document.querySelector("#hint-toggle");
const textoBtnDica = document.querySelector("#hint-btn-text");
const descDica = document.querySelector("#hint-consensus-desc");
const caixaDicaRevelada = document.querySelector("#hint-revealed-box");
const textoDica = document.querySelector("#hint");

const containerTeclado = document.querySelector("#virtual-keyboard");
const dicaTeclado = document.querySelector("#keyboard-hint-text");
const botaoTema = document.querySelector("#theme-toggle");
const botaoSom = document.querySelector("#sound-toggle");
const overlayVinheta = document.querySelector("#vignette-overlay");

// Modal de Fim de Jogo
const modalFimJogo = document.querySelector("#game-over-modal");
const iconeModal = document.querySelector("#modal-icon");
const tituloModal = document.querySelector("#modal-title");
const subtituloModal = document.querySelector("#modal-subtitle");
const palavraModal = document.querySelector("#modal-word");
const botaoModalJogarNovamente = document.querySelector("#modal-play-again-button");
const botaoModalVoltarLobby = document.querySelector("#modal-return-lobby-button");

const chaveSessao = "forca-distribuida-session";
const chavePartida = "forca-distribuida-match";
const chaveNomePreferido = "forca-distribuida-preferred-name";
const chaveTema = "forca-distribuida-theme";
const chaveSom = "forca-distribuida-sound";

// Sistema de Efeitos Sonoros Sintetizados Proceduralmente (Web Audio API nativa)
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
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem(chaveSom, String(this.muted));
    this.atualizarBotaoSom();
    if (!this.muted) {
      this.votoDica();
    }
    return this.muted;
  }

  atualizarBotaoSom() {
    if (botaoSom) {
      botaoSom.textContent = this.muted ? "🔇" : "🔊";
      botaoSom.title = this.muted ? "Ativar efeitos sonoros" : "Silenciar sons";
    }
  }

  playTone(freq, tipo = "sine", duracao = 0.15, gainVal = 0.08) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duracao);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duracao);
    } catch {
      // Ignora restrição de reprodução automática
    }
  }

  tecla() {
    this.playTone(480, "sine", 0.05, 0.04);
  }

  acerto() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      // Chime alegre ascendente em arpeggio cintilante
      const notas = [523.25, 659.25, 783.99, 1046.5];
      notas.forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, "sine", 0.2, 0.09), idx * 75);
      });
    } catch {}
  }

  erro() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      // Buzz arcade com decaimento dinâmico de frequência
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.26);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.26);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    } catch {}
  }

  votoDica() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      // Ding suave cristalino para dica
      this.playTone(880, "sine", 0.35, 0.09);
      setTimeout(() => this.playTone(1320, "triangle", 0.38, 0.06), 40);
    } catch {}
  }

  vitoria() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      // Fanfarra arcade vitoriosa
      const melodia = [
        { f: 523.25, d: 0.12, t: 0 },
        { f: 659.25, d: 0.12, t: 110 },
        { f: 783.99, d: 0.14, t: 220 },
        { f: 1046.5, d: 0.38, t: 340 },
        { f: 880, d: 0.14, t: 500 },
        { f: 1046.5, d: 0.55, t: 650 }
      ];
      melodia.forEach(({ f, d, t }) => {
        setTimeout(() => this.playTone(f, "triangle", d, 0.14), t);
      });
    } catch {}
  }

  derrota() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      // Som clássico de derrota com notas descendentes
      const notas = [440, 392, 349.23, 277.18, 220];
      notas.forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, "sawtooth", 0.3, 0.1), idx * 125);
      });
    } catch {}
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

// Efeito Confete para Vitória
function dispararConfetes() {
  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const cores = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#a855f7"];
  const particulas = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: Math.random() * 8 + 6,
    h: Math.random() * 6 + 4,
    cor: cores[Math.floor(Math.random() * cores.length)],
    vy: Math.random() * 3 + 2,
    vx: (Math.random() - 0.5) * 2,
    rotacao: Math.random() * 360,
    vRot: (Math.random() - 0.5) * 8
  }));

  let animId;
  const fimAnim = Date.now() + 4000;

  function animar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particulas.forEach((p) => {
      p.y += p.vy;
      p.x += p.vx;
      p.rotacao += p.vRot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotacao * Math.PI) / 180);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (Date.now() < fimAnim) {
      animId = requestAnimationFrame(animar);
    } else {
      cancelAnimationFrame(animId);
      canvas.remove();
    }
  }

  animar();
}

const sessao = carregarJson(chaveSessao);
const socketController = io();
let dadosPartida = carregarJson(chavePartida);
let estadoAtual = null;
let socketPartida = null;
let temporizadorRecuperacao = null;
let desconexaoEsperada = false;
let temporizadorTurno = null;
let prazoTurnoLocal = null;
let limiteTempoTurnoMs = 20000;
let ultimosErrosVisualizador = 0;
let ultimosErrosAdversario = 0;
let ultimasLetrasAcertadas = 0;
let hintJaRevelada = false;

// Estado das Estatísticas do HUD de Combate
let viewerTotalGuesses = 0;
let viewerHitsCount = 0;
let viewerStreak = 0;
let viewerTurnStart = null;
let viewerTurnDurations = [];
let matchStartTimestamp = null;
let matchTimerInterval = null;
let pendingViewerLetter = null;

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
  if (!listaEventos) {
    return;
  }
  const item = document.createElement("li");
  item.textContent = `[${new Date().toLocaleTimeString()}] ${mensagem}`;
  listaEventos.prepend(item);
}

// HUD de Combate: Atualização de Estatísticas em Tempo Real
function atualizarHudCombate() {
  // 1. Precisão de Acertos (%)
  const accuracy = viewerTotalGuesses > 0 ? Math.round((viewerHitsCount / viewerTotalGuesses) * 100) : 100;
  if (statAccuracy) {
    statAccuracy.textContent = `${accuracy}%`;
  }

  // 2. Tempo Médio por Lance
  const avgTime = viewerTurnDurations.length > 0
    ? (viewerTurnDurations.reduce((acc, curr) => acc + curr, 0) / viewerTurnDurations.length).toFixed(1)
    : "0.0";
  if (statAvgTime) {
    statAvgTime.textContent = `${avgTime}s`;
  }

  // 3. Sequência de Acertos (Streak)
  if (statStreak) {
    statStreak.textContent = `${viewerStreak}x`;
    if (statStreakIcon) {
      statStreakIcon.classList.toggle("streak-fire", viewerStreak >= 2);
    }
  }
}

function iniciarCronometroPartida(createdAt) {
  if (matchTimerInterval) return;
  matchStartTimestamp = createdAt || Date.now();

  function atualizarTempo() {
    if (!statDuration) return;
    const decorridoSeg = Math.max(0, Math.floor((Date.now() - matchStartTimestamp) / 1000));
    const minutos = String(Math.floor(decorridoSeg / 60)).padStart(2, "0");
    const segundos = String(decorridoSeg % 60).padStart(2, "0");
    statDuration.textContent = `${minutos}:${segundos}`;
  }

  atualizarTempo();
  matchTimerInterval = setInterval(atualizarTempo, 1000);
}

function pararCronometroPartida() {
  if (matchTimerInterval) {
    clearInterval(matchTimerInterval);
    matchTimerInterval = null;
  }
}

// Efeito de Tremor na Tela (Screen Shake) ao errar
function sacudirTela() {
  document.body.classList.remove("screen-shake");
  void document.body.offsetWidth; // Forçar reflow
  document.body.classList.add("screen-shake");

  if (overlayVinheta) {
    overlayVinheta.classList.remove("flash-red");
    void overlayVinheta.offsetWidth;
    overlayVinheta.classList.add("flash-red");
    setTimeout(() => overlayVinheta.classList.remove("flash-red"), 350);
  }

  setTimeout(() => document.body.classList.remove("screen-shake"), 450);
}

// Renderização das Forcas de Duelo (Um boneco independente para cada jogador)
function renderizarForca(partes, alvo = "me") {
  const container = alvo === "opponent" ? estagioForcaOpponent : (estagioForcaMe || estagioForca);
  if (container) {
    container.querySelectorAll(".part").forEach((elemento) => {
      const estavaVisivel = elemento.classList.contains("visible");
      const agoraVisivel = partes.includes(elemento.dataset.part);
      if (!estavaVisivel && agoraVisivel) {
        elemento.classList.add("visible", "dramatic-entry");
      } else if (!agoraVisivel) {
        elemento.classList.remove("visible", "dramatic-entry");
      }
    });
  } else {
    document.querySelectorAll(".part").forEach((elemento) => {
      elemento.classList.toggle("visible", partes.includes(elemento.dataset.part));
    });
  }
}

function sacudirForca(alvo = "me") {
  const container = alvo === "opponent" ? estagioForcaOpponent : (estagioForcaMe || estagioForca);
  if (!container) return;
  container.classList.remove("shake");
  void container.offsetWidth;
  container.classList.add("shake");
  setTimeout(() => container.classList.remove("shake"), 500);
}

function renderizarForcasDuelo(estado) {
  if (!estado || !Array.isArray(estado.players)) return;

  const me = estado.players.find((p) => p.playerId === estado.viewerPlayerId) || estado.players[0];
  const opponent = estado.players.find((p) => p.playerId !== estado.viewerPlayerId) || estado.players[1];

  // 1. Atualizar Forca e Status de Você
  if (me) {
    if (nomePlayerMe) nomePlayerMe.textContent = me.playerName || "Você";
    const partesMe = me.hangmanPartsDrawn || [];
    renderizarForca(partesMe, "me");
    if (legendaForcaMe) {
      legendaForcaMe.textContent = `Seus erros: ${me.errors || 0}/${estado.maxErrors || 6}`;
    }
    if (cardPlayerMe) {
      cardPlayerMe.classList.toggle("active-turn", Boolean(me.isTurn));
    }
    if (semaforoBadgeMe && semaforoTextMe) {
      semaforoBadgeMe.className = `semaphore-badge ${me.isTurn ? "turn-active" : "turn-waiting"}`;
      semaforoTextMe.textContent = me.isTurn ? "🟢 Sua Vez" : "🔴 Aguarde";
    }
  }

  // 2. Atualizar Forca e Status do Adversário
  if (opponent) {
    if (nomePlayerOpponent) nomePlayerOpponent.textContent = opponent.playerName || "Adversário";
    const partesOpponent = opponent.hangmanPartsDrawn || [];
    renderizarForca(partesOpponent, "opponent");
    if (legendaForcaOpponent) {
      legendaForcaOpponent.textContent = `Erros do adversário: ${opponent.errors || 0}/${estado.maxErrors || 6}`;
    }
    if (cardPlayerOpponent) {
      cardPlayerOpponent.classList.toggle("active-turn", Boolean(opponent.isTurn));
    }
    if (semaforoBadgeOpponent && semaforoTextOpponent) {
      semaforoBadgeOpponent.className = `semaphore-badge ${opponent.isTurn ? "turn-active" : "turn-waiting"}`;
      semaforoTextOpponent.textContent = opponent.isTurn ? "🟢 Vez dele" : "🔴 Aguardando";
    }
  }

  // 3. Semáforo Central Distribuído
  const meuTurno = Boolean(me && me.isTurn);
  if (lightGreen && lightYellow && lightRed) {
    lightGreen.classList.toggle("active", meuTurno && estado.status === "playing");
    lightYellow.classList.toggle("active", estado.status !== "playing");
    lightRed.classList.toggle("active", !meuTurno && estado.status === "playing");
  }
  if (semaforoSublabel) {
    semaforoSublabel.textContent = estado.status === "playing"
      ? (meuTurno ? "🟢 SUA VEZ" : "🔴 ADVERSÁRIO")
      : "🟡 AGUARDANDO";
  }
}

function atualizarFaixaTurno(tipo, mensagem) {
  faixaTurno.className = `turn-banner ${tipo}`;
  if (mensagemTurno) {
    mensagemTurno.textContent = mensagem;
  } else {
    faixaTurno.textContent = mensagem;
  }
}

function pararTemporizadorTurno() {
  if (temporizadorTurno) {
    clearInterval(temporizadorTurno);
    temporizadorTurno = null;
  }
  prazoTurnoLocal = null;
  if (barraProgressoTurno) {
    barraProgressoTurno.style.width = "0%";
  }
  if (seloContadorTurno) {
    seloContadorTurno.textContent = "⏱️ --s";
  }
}

function formatarSegundosRestantes(restanteMs) {
  return Math.max(1, Math.ceil(restanteMs / 1000));
}

function renderizarTempoTurno() {
  if (!estadoAtual || estadoAtual.status !== "playing" || !prazoTurnoLocal) {
    pararTemporizadorTurno();
    return;
  }

  const visualizador = estadoAtual.players.find((jogador) => jogador.playerId === estadoAtual.viewerPlayerId);
  const podeJogar = Boolean(visualizador && visualizador.isTurn && visualizador.connected);
  const restanteMs = Math.max(prazoTurnoLocal - Date.now(), 0);
  const segundos = formatarSegundosRestantes(restanteMs);

  const porcentagem = Math.min(100, Math.max(0, (restanteMs / limiteTempoTurnoMs) * 100));
  if (barraProgressoTurno) {
    barraProgressoTurno.style.width = `${porcentagem}%`;
    barraProgressoTurno.className = "turn-timer-bar" + (segundos <= 5 ? " danger" : segundos <= 10 ? " warning" : "");
  }

  if (seloContadorTurno) {
    seloContadorTurno.textContent = `⏱️ ${segundos}s`;
  }

  subtituloPartida.textContent = `Vez de ${estadoAtual.currentTurnPlayerName || "aguardar"} • ${segundos}s restantes`;

  if (podeJogar) {
    atualizarFaixaTurno("active", `🎯 Sua vez de jogar! Escolha uma letra em ${segundos}s.`);
  } else {
    atualizarFaixaTurno("idle", `⏳ Aguarde. Agora é a vez de ${estadoAtual.currentTurnPlayerName || "seu adversário"} (${segundos}s).`);
  }
}

function iniciarTemporizadorTurno(estado) {
  pararTemporizadorTurno();
  if (estado.status !== "playing" || !Number.isFinite(estado.remainingTurnMs)) {
    return;
  }

  limiteTempoTurnoMs = estado.turnTimeLimitMs || 20000;
  prazoTurnoLocal = Date.now() + estado.remainingTurnMs;
  renderizarTempoTurno();
  temporizadorTurno = setInterval(renderizarTempoTurno, 200);
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

function encerrarFluxoDaPartida({ jogarNovamente = false } = {}) {
  if (sessao?.playerName) {
    localStorage.setItem(chaveNomePreferido, sessao.playerName);
  }

  localStorage.removeItem(chaveSessao);
  localStorage.removeItem(chavePartida);

  if (socketPartida) {
    desconexaoEsperada = true;
    socketPartida.removeAllListeners();
    socketPartida.disconnect();
  }

  const destino = jogarNovamente ? "/?playAgain=1" : "/";
  window.location.href = destino;
}

// Renderização dos Jogadores (Duelo 1v1)
function renderizarJogadores(estado) {
  if (!containerJogadores) return;
  containerJogadores.innerHTML = "";
  const maxErros = estado.maxErrors || 6;

  estado.players.forEach((jogador) => {
    const card = document.createElement("article");
    card.className = "player-card";
    if (jogador.isTurn) {
      card.classList.add("active");
    }
    if (!jogador.connected) {
      card.classList.add("disconnected");
    }

    const isViewer = jogador.playerId === estado.viewerPlayerId;
    const inicial = (jogador.playerName || "J").charAt(0).toUpperCase();

    // Montagem dos corações de vidas restantes
    const erros = Number(jogador.errors) || 0;
    const vidasRestantes = Math.max(0, maxErros - erros);
    const coracoesHtml = Array.from({ length: maxErros }, (_, idx) => {
      const perdido = idx >= vidasRestantes;
      return `<span class="heart-slot ${perdido ? "lost" : ""}" title="${perdido ? "Vida perdida" : "Vida ativa"}">${perdido ? "💀" : "❤️"}</span>`;
    }).join("");

    const textoReconexao = !jogador.connected && jogador.remainingReconnectMs > 0
      ? `🟠 Reconectando até ${Math.ceil(jogador.remainingReconnectMs / 1000)}s`
      : (jogador.connected ? "🟢 Conectado" : "🔴 Desconectado");

    card.innerHTML = `
      <div>
        <div class="player-card-header">
          <div class="player-info-row">
            <div class="player-avatar">${inicial}</div>
            <div class="player-names">
              <strong>${jogador.playerName}</strong>
              ${isViewer ? '<span class="you-tag">Você</span>' : '<span style="font-size: 0.75rem; color: var(--text-muted);">Adversário</span>'}
            </div>
          </div>
          <span class="turn-pill ${jogador.isTurn ? "playing" : "waiting"}">
            ${jogador.isTurn ? "🎯 Na vez" : "⏳ Em espera"}
          </span>
        </div>

        <div class="lives-container">
          <div class="lives-label">
            <span>Vidas (${vidasRestantes}/${maxErros})</span>
            <span style="color: var(--accent-rose);">${erros} erro(s)</span>
          </div>
          <div class="hearts-row">${coracoesHtml}</div>
        </div>
      </div>

      <div class="connection-status">
        <span>${textoReconexao}</span>
      </div>
    `;

    containerJogadores.appendChild(card);
  });
}

// Renderização das Letras da Palavra Secreta em Blocos Elevados
function renderizarPalavra(maskedWord) {
  if (!palavraMascarada) return;
  palavraMascarada.innerHTML = "";

  const caracteres = (maskedWord || "").split(" ");
  caracteres.forEach((char) => {
    const tile = document.createElement("span");
    const isRevealed = char !== "_";
    tile.className = `letter-tile ${isRevealed ? "revealed" : "blank"}`;
    tile.textContent = isRevealed ? char : "";
    palavraMascarada.appendChild(tile);
  });
}

// Renderização das Letras Erradas em Chips
function renderizarLetrasErradas(letras) {
  if (!letrasErradas) return;

  if (!letras || letras.length === 0) {
    letrasErradas.innerHTML = `<span class="wrong-none">Nenhuma letra errada ainda</span>`;
    return;
  }

  letrasErradas.innerHTML = letras.map((letra) => `
    <span class="wrong-chip" title="Letra incorreta">${letra.toUpperCase()}</span>
  `).join("");
}

// Renderização do Tema e Dificuldade
function renderizarTemaEDificuldade(estado) {
  if (temaPartida) {
    const temaNome = (estado.topic || "Geral").toUpperCase();
    temaPartida.innerHTML = `🏷️ TEMA: <strong>${temaNome}</strong>`;
  }

  if (badgeDificuldade) {
    const diff = estado.difficulty || "Médio";
    const diffLower = diff.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    badgeDificuldade.className = `arena-tag-badge difficulty-badge diff-${diffLower}`;
    badgeDificuldade.innerHTML = `⚡ DIFICULDADE: <strong>${diff}</strong>`;
  }
}

// Renderização do Sistema de Dica por Consenso 2/2
function renderizarDicaConsenso(estado) {
  if (!botaoDica) return;

  const hintLiberada = Boolean(estado.hintRequested);
  const hintVotes = Array.isArray(estado.hintVotes) ? estado.hintVotes : [];
  const hintCount = Number(estado.hintVotesCount || hintVotes.length);
  const myPlayerId = sessao?.playerId || estado.viewerPlayerId;
  const myVote = Boolean(estado.myHintVote || hintVotes.includes(myPlayerId));
  const opponentVote = Boolean(hintVotes.some((id) => id !== myPlayerId) || (hintCount === 1 && !myVote));

  if (hintLiberada) {
    if (!hintJaRevelada) {
      hintJaRevelada = true;
      som.votoDica();
      if (caixaDicaRevelada) {
        caixaDicaRevelada.classList.remove("hidden");
        caixaDicaRevelada.classList.add("revealing-gold");
      }
    } else {
      if (caixaDicaRevelada) {
        caixaDicaRevelada.classList.remove("hidden");
      }
    }

    if (badgeStatusDica) {
      badgeStatusDica.textContent = "2/2 Consenso Atingido";
      badgeStatusDica.className = "hint-consensus-badge consensus-reached";
    }

    if (textoBtnDica) {
      textoBtnDica.textContent = "💡 Dica Revelada (2/2)";
    }
    botaoDica.disabled = true;
    botaoDica.style.display = "none";

    if (textoDica) {
      textoDica.hidden = false;
      textoDica.innerHTML = `<span>Dica: <strong>${estado.hint || "Palavra especial"}</strong></span>`;
    }

    if (descDica) {
      descDica.textContent = "Consenso atingido (2/2)! Dica secreta liberada para ambos os jogadores.";
    }
  } else {
    hintJaRevelada = false;
    if (caixaDicaRevelada) {
      caixaDicaRevelada.classList.add("hidden");
      caixaDicaRevelada.classList.remove("revealing-gold");
    }
    if (textoDica) {
      textoDica.hidden = true;
    }
    botaoDica.style.display = "inline-flex";

    if (hintCount === 0) {
      if (badgeStatusDica) {
        badgeStatusDica.textContent = "0/2 Votos";
        badgeStatusDica.className = "hint-consensus-badge";
      }
      botaoDica.className = "hint-consensus-btn";
      if (textoBtnDica) textoBtnDica.textContent = "Pedir Dica (0/2)";
      botaoDica.disabled = estado.status !== "playing";
      if (descDica) {
        descDica.textContent = "Ambos os jogadores devem pedir a dica para que ela seja revelada sem penalidades.";
      }
    } else if (myVote && !opponentVote) {
      if (badgeStatusDica) {
        badgeStatusDica.textContent = "1/2 Votos";
        badgeStatusDica.className = "hint-consensus-badge waiting-vote";
      }
      botaoDica.className = "hint-consensus-btn waiting-pulse";
      if (textoBtnDica) textoBtnDica.textContent = "Você votou! Aguardando oponente (1/2)";
      botaoDica.disabled = true;
      if (descDica) {
        descDica.textContent = "Seu voto foi registrado! Aguardando o adversário aceitar a dica.";
      }
    } else if (opponentVote && !myVote) {
      if (badgeStatusDica) {
        badgeStatusDica.textContent = "1/2 Votos";
        badgeStatusDica.className = "hint-consensus-badge pending-action";
      }
      botaoDica.className = "hint-consensus-btn accept-glow";
      if (textoBtnDica) textoBtnDica.textContent = "Oponente pediu a dica! Clique para aceitar (1/2)";
      botaoDica.disabled = estado.status !== "playing";
      if (descDica) {
        descDica.textContent = "Seu adversário quer ver a dica! Clique no botão para conceder consenso mútuo.";
      }
    }
  }
}

// Criação e Atualização do Teclado Virtual A-Z
const layoutTeclado = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"]
];

function criarTecladoVirtual() {
  if (!containerTeclado) return;
  containerTeclado.innerHTML = "";

  layoutTeclado.forEach((linha) => {
    const divLinha = document.createElement("div");
    divLinha.className = "keyboard-row";

    linha.forEach((letra) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      btn.dataset.key = letra;
      btn.textContent = letra.toUpperCase();
      btn.addEventListener("click", () => enviarPalpiteLetra(letra));
      divLinha.appendChild(btn);
    });

    containerTeclado.appendChild(divLinha);
  });
}

function atualizarTecladoVirtual(estado, podeJogar) {
  if (!containerTeclado) return;

  const letrasTentadas = new Set(estado?.attemptedLetters || []);
  const letrasErradasSet = new Set(estado?.wrongLetters || []);

  document.querySelectorAll(".key-btn").forEach((btn) => {
    const letra = btn.dataset.key;
    const tentada = letrasTentadas.has(letra);
    const errada = letrasErradasSet.has(letra);

    btn.classList.toggle("correct", tentada && !errada);
    btn.classList.toggle("wrong", tentada && errada);
    btn.disabled = tentada || !podeJogar;
  });

  if (dicaTeclado) {
    dicaTeclado.textContent = podeJogar
      ? "🎯 Sua vez! Clique ou digite uma letra no teclado."
      : "⏳ Aguarde a vez do adversário.";
  }
}

function enviarPalpiteLetra(letra) {
  if (!socketPartida || !estadoAtual) return;

  const visualizador = estadoAtual.players.find((jogador) => jogador.playerId === estadoAtual.viewerPlayerId);
  const podeJogar = estadoAtual.status === "playing" && visualizador && visualizador.isTurn && visualizador.connected;
  if (!podeJogar) return;

  const l = letra.toLowerCase();
  if (estadoAtual.attemptedLetters?.includes(l)) return;

  som.tecla();

  // Registrar tempo de resposta do lance
  if (viewerTurnStart) {
    const duration = Math.max(0.1, (Date.now() - viewerTurnStart) / 1000);
    viewerTurnDurations.push(duration);
    viewerTurnStart = null;
  }

  // Guardar letra pendente para avaliar acerto/erro nas estatísticas do HUD
  pendingViewerLetter = l;

  // Efeito visual tátil no botão da tecla
  const btnKey = document.querySelector(`.key-btn[data-key="${l}"]`);
  if (btnKey) {
    btnKey.style.transform = "scale(0.88)";
    setTimeout(() => {
      btnKey.style.transform = "";
    }, 150);
  }

  socketPartida.emit("guess-letter", {
    gameId: estadoAtual.gameId,
    playerId: sessao.playerId,
    letter: l
  });
}

// Captura de Teclas Físicas do Teclado
window.addEventListener("keydown", (evento) => {
  if (evento.target !== campoPalpite && (evento.target.tagName === "INPUT" || evento.target.tagName === "TEXTAREA")) {
    return;
  }

  const tecla = evento.key.toLowerCase();
  if (/^[a-z]$/.test(tecla)) {
    evento.preventDefault();
    enviarPalpiteLetra(tecla);
  }
});

// Modal de Fim de Jogo
function exibirModalFimJogo(venceu, motivo, palavraSecreta) {
  if (!modalFimJogo) return;

  pararCronometroPartida();

  if (venceu) {
    som.vitoria();
    dispararConfetes();
    iconeModal.textContent = "🏆";
    tituloModal.textContent = "Vitória Espetacular!";
    subtituloModal.textContent = `Parabéns! Você decifrou a palavra e venceu o duelo! Motivo: ${motivo || "Palavra completada"}.`;
  } else {
    som.derrota();
    iconeModal.textContent = "💀";
    tituloModal.textContent = "Você Foi Enforcado!";
    subtituloModal.textContent = `Fim de jogo! Seu adversário levou a melhor no duelo. Motivo: ${motivo || "Limite de erros atingido"}.`;
  }

  if (palavraModal && palavraSecreta) {
    palavraModal.textContent = palavraSecreta.toUpperCase();
  }

  modalFimJogo.classList.remove("hidden");
}

function renderizarEstadoPartida(estado) {
  const visualizador = estado.players.find((jogador) => jogador.playerId === estado.viewerPlayerId);
  const adversario = estado.players.find((jogador) => jogador.playerId !== estado.viewerPlayerId);
  const podeJogar = estado.status === "playing" && visualizador && visualizador.isTurn && visualizador.connected;

  // Iniciar cronômetro da partida
  if (estado.status === "playing") {
    iniciarCronometroPartida(estado.createdAt);
    if (podeJogar && !viewerTurnStart) {
      viewerTurnStart = Date.now();
    }
  }

  // Avaliação de jogada pendente do visualizador para estatísticas do HUD
  if (pendingViewerLetter) {
    const letra = pendingViewerLetter;
    viewerTotalGuesses += 1;
    const estavaCerta = estado.attemptedLetters.includes(letra) && !estado.wrongLetters.includes(letra);

    if (estavaCerta) {
      viewerHitsCount += 1;
      viewerStreak += 1;
    } else {
      viewerStreak = 0;
    }
    pendingViewerLetter = null;
    atualizarHudCombate();
  }

  // Detecção de novo erro ou acerto do visualizador
  const novosErrosMe = visualizador ? visualizador.errors : 0;
  const novosErrosOpp = adversario ? adversario.errors : 0;

  if (novosErrosMe > ultimosErrosVisualizador) {
    sacudirTela();
    sacudirForca("me");
    som.erro();
  } else if (novosErrosOpp > ultimosErrosAdversario) {
    sacudirForca("opponent");
  } else if (estado.maskedWord && estado.maskedWord.replace(/[^A-Za-z]/g, "").length > ultimasLetrasAcertadas) {
    som.acerto();
  }

  ultimosErrosVisualizador = novosErrosMe;
  ultimosErrosAdversario = novosErrosOpp;
  ultimasLetrasAcertadas = (estado.maskedWord || "").replace(/[^A-Za-z]/g, "").length;

  estadoAtual = estado;
  seloServidor.textContent = `🟢 ${estado.serverId}`;
  tituloPartida.textContent = "Arena de Duelo 1v1";
  subtituloPartida.textContent = estado.status === "finished"
    ? "Partida encerrada"
    : `Vez de ${estado.currentTurnPlayerName || "aguardar"}`;

  renderizarTemaEDificuldade(estado);
  renderizarPalavra(estado.maskedWord);
  renderizarDicaConsenso(estado);
  renderizarLetrasErradas(estado.wrongLetters);
  renderizarForcasDuelo(estado);
  renderizarJogadores(estado);
  atualizarTecladoVirtual(estado, podeJogar);
  atualizarHudCombate();

  if (legendaForcaMe && visualizador) {
    legendaForcaMe.textContent = `Seus erros: ${visualizador.errors}/${estado.maxErrors}`;
  }

  campoPalpite.disabled = !podeJogar;
  formularioPalpite.querySelector("button").disabled = !podeJogar;
  if (botaoDesistir) {
    botaoDesistir.disabled = estado.status === "finished";
  }
  if (acoesPosJogo) {
    acoesPosJogo.classList.toggle("hidden", estado.status !== "finished");
  }

  if (estado.status === "finished") {
    pararTemporizadorTurno();
    pararCronometroPartida();
    const venceu = estado.winnerPlayerId === estado.viewerPlayerId;
    atualizarFaixaTurno("finished", venceu ? "🏆 Partida encerrada. Você venceu!" : "💀 Partida encerrada. Você perdeu.");
    exibirModalFimJogo(venceu, "Duelo finalizado", estado.maskedWord);
  } else if (podeJogar) {
    atualizarFaixaTurno("active", "🎯 Sua vez de jogar! Escolha uma letra.");
  } else {
    atualizarFaixaTurno("idle", `⏳ Aguarde. Agora é a vez de ${estado.currentTurnPlayerName || "seu adversário"}.`);
  }

  iniciarTemporizadorTurno(estado);
}

// Botão de Dica (Consenso Mútuo 2/2)
botaoDica?.addEventListener("click", () => {
  if (!socketPartida || !estadoAtual || estadoAtual.hintRequested) {
    return;
  }

  som.votoDica();
  socketPartida.emit("request-hint", {
    gameId: estadoAtual.gameId,
    playerId: sessao.playerId
  });
});

botaoDesistir?.addEventListener("click", () => {
  if (!socketPartida || !estadoAtual || estadoAtual.status === "finished") {
    return;
  }

  const confirmou = window.confirm("Deseja realmente desistir da partida? Seu adversário será declarado vencedor!");
  if (!confirmou) {
    return;
  }

  socketPartida.emit("surrender-game", {
    gameId: estadoAtual.gameId,
    playerId: sessao.playerId
  });
  botaoDesistir.disabled = true;
});

botaoJogarNovamente?.addEventListener("click", () => {
  encerrarFluxoDaPartida({ jogarNovamente: true });
});

botaoVoltarLobby?.addEventListener("click", () => {
  encerrarFluxoDaPartida();
});

botaoModalJogarNovamente?.addEventListener("click", () => {
  encerrarFluxoDaPartida({ jogarNovamente: true });
});

botaoModalVoltarLobby?.addEventListener("click", () => {
  encerrarFluxoDaPartida();
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
    atualizarFaixaTurno("waiting", "🛡️ Aguardando migração automática da partida para outro nó do cluster...");
  }
}

function iniciarRecuperacao() {
  if (temporizadorRecuperacao) {
    return;
  }

  pararTemporizadorTurno();
  pararCronometroPartida();
  campoPalpite.disabled = true;
  formularioPalpite.querySelector("button").disabled = true;
  atualizarFaixaTurno("waiting", "⚠️ Servidor indisponível. Aguardando migração automática (failover)...");
  temporizadorRecuperacao = setInterval(consultarFailover, 3000);
  consultarFailover();
}

function criarSocketPartida(rawUrl) {
  try {
    const urlObj = new URL(rawUrl, window.location.origin);
    const basePath = urlObj.pathname.replace(/\/+$/, "");
    const options = {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000
    };
    if (basePath && basePath !== "") {
      options.path = `${basePath}/socket.io`;
    }
    return io(urlObj.origin, options);
  } catch {
    return io(rawUrl, { transports: ["websocket", "polling"] });
  }
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
  socketPartida = criarSocketPartida(dadosPartida.serverUrl);
  adicionarLog(`Conectando ao nó de jogo ${dadosPartida.serverUrl}...`);

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

    adicionarLog("Conexão com o servidor da partida foi interrompida.");
    iniciarRecuperacao();
  });

  socketPartida.on("joined-game", ({ serverId }) => {
    seloServidor.textContent = `🟢 ${serverId}`;
    adicionarLog(`Partida conectada em ${serverId}.`);
  });

  socketPartida.on("game-state", (estado) => {
    renderizarEstadoPartida(estado);
  });

  socketPartida.on("player-hangman-update", ({ playerId, hangmanPartsDrawn }) => {
    if (playerId === sessao?.playerId) {
      sacudirTela();
      sacudirForca("me");
      renderizarForca(hangmanPartsDrawn, "me");
    } else {
      sacudirForca("opponent");
      renderizarForca(hangmanPartsDrawn, "opponent");
    }
  });

  socketPartida.on("guess-feedback", ({ message }) => {
    adicionarLog(message);
  });

  socketPartida.on("player-disconnected", ({ playerId, reconnectGraceMs }) => {
    const rotulo = playerId === sessao.playerId ? "Você" : "Seu adversário";
    adicionarLog(`${rotulo} perdeu a conexão. Janela de reconexão: ${Math.ceil(reconnectGraceMs / 1000)}s.`);
  });

  socketPartida.on("game-over", ({ winnerPlayerId, reason }) => {
    const venceu = winnerPlayerId === sessao.playerId;
    adicionarLog(venceu ? `Você venceu! Motivo: ${reason}.` : `Você perdeu. Motivo: ${reason}.`);
    if (estadoAtual) {
      exibirModalFimJogo(venceu, reason, estadoAtual.maskedWord);
    }
  });

  socketPartida.on("join-error", ({ message }) => {
    adicionarLog(message);
    atualizarFaixaTurno("waiting", `⚠️ ${message} Aguardando realocação...`);
    if (socketPartida) {
      desconexaoEsperada = true;
      socketPartida.removeAllListeners();
      socketPartida.disconnect();
      socketPartida = null;
    }
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
    atualizarFaixaTurno("waiting", "Não foi possível restaurar a partida.");
  }
}

formularioPalpite.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const letra = campoPalpite.value.trim().toLowerCase();
  campoPalpite.value = "";
  if (!letra) return;
  enviarPalpiteLetra(letra);
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
    adicionarLog(`Controller informou migração da partida para ${payload.serverId || payload.serverUrl}.`);
  }

  if (payload.migrated || servidorMudou || !socketPartida || !socketPartida.connected) {
    conectarNaPartida();
  }
});

// Inicialização
inicializarTema();
criarTecladoVirtual();
renderizarForca([], "me");
renderizarForca([], "opponent");
campoPalpite.disabled = true;
formularioPalpite.querySelector("button").disabled = true;
pararTemporizadorTurno();
restaurarPartida();

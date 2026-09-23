const tituloPartida = document.querySelector("#game-title");
const subtituloPartida = document.querySelector("#game-subtitle");
const seloServidor = document.querySelector("#server-badge");
const faixaTurno = document.querySelector("#turn-banner");
const mensagemTurno = document.querySelector("#turn-message");
const seloContadorTurno = document.querySelector("#turn-countdown-badge");
const barraProgressoTurno = document.querySelector("#turn-timer-bar");
const palavraMascarada = document.querySelector("#masked-word");
const temaPartida = document.querySelector("#theme");
const textoDica = document.querySelector("#hint");
const botaoDica = document.querySelector("#hint-toggle");
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

const containerTeclado = document.querySelector("#virtual-keyboard");
const dicaTeclado = document.querySelector("#keyboard-hint-text");
const botaoTema = document.querySelector("#theme-toggle");
const botaoSom = document.querySelector("#sound-toggle");

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

// Sistema de Efeitos Sonoros com Web Audio API
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
      this.playTone(523.25, "sine", 0.1);
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
      if (this.ctx.state === "suspended") this.ctx.resume();
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
    this.playTone(480, "sine", 0.06, 0.04);
  }

  acerto() {
    this.playTone(523.25, "sine", 0.12, 0.1);
    setTimeout(() => this.playTone(659.25, "sine", 0.15, 0.1), 90);
    setTimeout(() => this.playTone(783.99, "sine", 0.25, 0.12), 180);
  }

  erro() {
    this.playTone(180, "sawtooth", 0.25, 0.12);
  }

  vitoria() {
    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, "triangle", 0.35, 0.14), idx * 120);
    });
  }

  derrota() {
    const notas = [440, 392, 349.23, 293.66];
    notas.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, "sawtooth", 0.3, 0.12), idx * 140);
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
let ultimasLetrasAcertadas = 0;

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

// Renderização das Forcas de Duelo (Um boneco independente para cada jogador)
function renderizarForca(partes, alvo = "me") {
  const container = alvo === "opponent" ? estagioForcaOpponent : (estagioForcaMe || estagioForca);
  if (container) {
    container.querySelectorAll(".part").forEach((elemento) => {
      elemento.classList.toggle("visible", partes.includes(elemento.dataset.part));
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
  void container.offsetWidth; // trigger reflow
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

  const caracteres = maskedWord.split(" ");
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
      ? "🎯 Sua vez! Clique ou digite uma letra."
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

  // Efeito visual no botão da tecla
  const btnKey = document.querySelector(`.key-btn[data-key="${l}"]`);
  if (btnKey) {
    btnKey.style.transform = "scale(0.9)";
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
  // Ignora se estiver digitando em outro input que não o campo de palpite
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

  if (venceu) {
    som.vitoria();
    dispararConfetes();
    iconeModal.textContent = "🏆";
    tituloModal.textContent = "Vitória Espetacular!";
    subtituloModal.textContent = `Parabéns! Você venceu a partida. Motivo: ${motivo || "Você decifrou a palavra!"}.`;
  } else {
    som.derrota();
    iconeModal.textContent = "💀";
    tituloModal.textContent = "Você Foi Enforcado!";
    subtituloModal.textContent = `Fim de jogo! Seu adversário venceu a disputa. Motivo: ${motivo || "Limite de erros atingido"}.`;
  }

  if (palavraModal && palavraSecreta) {
    palavraModal.textContent = palavraSecreta.toUpperCase();
  }

  modalFimJogo.classList.remove("hidden");
}

function renderizarEstadoPartida(estado) {
  const visualizador = estado.players.find((jogador) => jogador.playerId === estado.viewerPlayerId);
  const podeJogar = estado.status === "playing" && visualizador && visualizador.isTurn && visualizador.connected;

  // Detecção de novo erro ou acerto para tocar som e sacudir forca
  const novosErros = visualizador ? visualizador.errors : 0;
  if (novosErros > ultimosErrosVisualizador) {
    sacudirForca();
    som.erro();
  } else if (estado.maskedWord && estado.maskedWord.replace(/[^A-Za-z]/g, "").length > ultimasLetrasAcertadas) {
    som.acerto();
  }
  ultimosErrosVisualizador = novosErros;
  ultimasLetrasAcertadas = (estado.maskedWord || "").replace(/[^A-Za-z]/g, "").length;

  estadoAtual = estado;
  seloServidor.textContent = `🟢 ${estado.serverId}`;
  tituloPartida.textContent = "Duelo em Andamento";
  subtituloPartida.textContent = estado.status === "finished" ? "Partida encerrada" : `Vez de ${estado.currentTurnPlayerName || "aguardar"}`;
  
  renderizarPalavra(estado.maskedWord);
  temaPartida.innerHTML = `🏷️ Tema: <strong>${estado.topic || "Geral"}</strong>`;
  textoDica.textContent = `💡 Dica: ${estado.hint || "indisponível"}`;
  textoDica.hidden = !estado.hintRequested;
  botaoDica.textContent = estado.hintRequested ? "💡 Dica exibida para todos" : "💡 Pedir dica";
  botaoDica.disabled = estado.hintRequested || !podeJogar;
  
  renderizarLetrasErradas(estado.wrongLetters);
  renderizarForcasDuelo(estado);
  renderizarJogadores(estado);
  atualizarTecladoVirtual(estado, podeJogar);

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

botaoDica.addEventListener("click", () => {
  if (!socketPartida || !estadoAtual || estadoAtual.hintRequested) {
    return;
  }

  som.playTone(600, "triangle", 0.2);
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
    atualizarFaixaTurno("waiting", "🛡️ Aguardando migração automática da partida para outro servidor...");
  }
}

function iniciarRecuperacao() {
  if (temporizadorRecuperacao) {
    return;
  }

  pararTemporizadorTurno();
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
  adicionarLog(`Conectando ao servidor ${dadosPartida.serverUrl}...`);

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

    adicionarLog("Conexão com o servidor da partida foi perdida.");
    iniciarRecuperacao();
  });

  socketPartida.on("joined-game", ({ serverId }) => {
    seloServidor.textContent = `🟢 ${serverId}`;
    adicionarLog(`Partida conectada em ${serverId}.`);
  });

  socketPartida.on("game-state", (estado) => {
    renderizarEstadoPartida(estado);
  });

  socketPartida.on("player-hangman-update", ({ playerId, errors, hangmanPartsDrawn }) => {
    if (playerId === sessao?.playerId) {
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

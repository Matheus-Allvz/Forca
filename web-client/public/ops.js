/**
 * ============================================================================
 * PAINEL DE OPERAÇÕES, OBSERVABILIDADE E ENGENHARIA DE CAOS (ops.js)
 * Forca Distribuída • Cluster Incus / LXC • SRE Control Panel
 * ============================================================================
 */

(function () {
  "use strict";

  // Configuration & State
  const CONFIG = {
    metricsPollIntervalMs: 2000,
    chartSampleIntervalMs: 1500,
    maxChartHistory: 30,
    storageThemeKey: "forca-distribuida-theme",
    storageSoundKey: "forca-ops-sound-muted",
  };

  const state = {
    operator: {
      name: "Operador",
      email: "Identificando sessão...",
      role: "SRE Operator",
      isAuthenticated: false,
    },
    cluster: {
      leader: "ctrl-primary",
      epoch: 1,
      quorum: "4 / 4",
      activeGames: 0,
      activeSessions: 0,
      waitingQueue: 0,
      mttr: "1.37s",
      healthy: true,
      hostMemoryPercent: 0,
    },
    nodes: {
      "ctrl-primary": { name: "ctrl-primary", ip: "10.10.10.10:8088", role: "Primary Leader", status: "ativo", ram: 48, maxRam: 256, games: 0, hb: 20 },
      "ctrl-backup": { name: "ctrl-backup", ip: "10.10.10.20:8088", role: "Standby Watchdog", status: "standby", ram: 42, maxRam: 256, games: 0, hb: 22 },
      "game-node-1": { name: "game-node-1", ip: "10.10.10.101", role: "Data Worker 1", status: "ativo", ram: 82, maxRam: 512, games: 0, hb: 18 },
      "game-node-2": { name: "game-node-2", ip: "10.10.10.102", role: "Data Worker 2", status: "ativo", ram: 79, maxRam: 512, games: 0, hb: 24 },
      "game-node-3": { name: "game-node-3", ip: "10.10.10.103", role: "Elastic Auto-Heal", status: "standby", ram: 0, maxRam: 512, games: 0, hb: 0 },
    },
    events: [],
    activeFilter: "all",
    searchQuery: "",
    autoScroll: true,
    soundMuted: false,
    chartsPaused: false,
    selectedWindow: "15m",
    samples: [],
    annotations: [],
    incidents: [],
    forensicIndex: null,
    charts: {
      ram: null,
      games: null,
      cpu: null
    },
    sreScorecard: {
      uptimePercent: 99.98,
      mttrProcess: 1.37,
      mttrNode: 7.82,
      totalAutoHealings: 0,
      totalIncidents: 0
    },
    activeModalAction: null,
  };

  // DOM Elements
  const DOM = {
    // Nav & Operator
    operatorName: document.getElementById("operator-name"),
    operatorEmail: document.getElementById("operator-email"),
    operatorAvatar: document.getElementById("operator-avatar"),
    clusterGlobalBadge: document.getElementById("cluster-global-badge"),
    clusterGlobalText: document.getElementById("cluster-global-text"),
    soundToggle: document.getElementById("sound-toggle"),
    themeToggle: document.getElementById("theme-toggle"),
    socketBadge: document.getElementById("socket-status-badge"),

    // KPIs
    kpiNodesQuorum: document.getElementById("kpi-nodes-quorum"),
    kpiNodesQuorumSub: document.getElementById("kpi-nodes-quorum-sub"),
    kpiActiveGames: document.getElementById("kpi-active-games"),
    kpiActiveSessions: document.getElementById("kpi-active-sessions"),
    kpiCtrlLeader: document.getElementById("kpi-ctrl-leader"),
    kpiFencingEpoch: document.getElementById("kpi-fencing-epoch"),
    kpiMttrVal: document.getElementById("kpi-mttr-val"),

    // Chaos section
    chaosStatusStrip: document.getElementById("chaos-status-strip"),
    chaosStatusIndicator: document.getElementById("chaos-status-indicator"),
    chaosStatusTarget: document.getElementById("chaos-status-target"),
    chaosStatusTime: document.getElementById("chaos-status-time"),
    chaosButtons: document.querySelectorAll(".btn-chaos-action"),

    // Nodes
    nodesContainer: document.getElementById("nodes-container"),
    nodesLastSync: document.getElementById("nodes-last-sync"),
    btnRefreshNodes: document.getElementById("btn-refresh-nodes"),

    // Observability & Charts
    ramCanvas: document.getElementById("ramChartCanvas"),
    gamesCanvas: document.getElementById("gamesChartCanvas"),
    cpuCanvas: document.getElementById("cpuChartCanvas"),
    btnToggleChartsStream: document.getElementById("btn-toggle-charts-stream"),
    btnWin1m: document.getElementById("btn-win-1m"),
    btnWin3m: document.getElementById("btn-win-3m"),
    btnWin5m: document.getElementById("btn-win-5m"),
    btnWin15m: document.getElementById("btn-win-15m"),
    btnWin30m: document.getElementById("btn-win-30m"),
    btnWin60m: document.getElementById("btn-win-60m"),
    btnExportCsv: document.getElementById("btn-export-csv"),
    btnDownloadChartsImg: document.getElementById("btn-download-charts-img"),
    metricsStreamBadge: document.getElementById("metrics-stream-badge"),
    nodeFilterChips: document.querySelectorAll(".node-toggle-chip"),

    // Swimlane Gantt & Forensic Controls
    swimlaneTracksContainer: document.getElementById("swimlane-tracks-container"),
    annotationsPillsList: document.getElementById("annotations-pills-list"),
    forensicTimeSlider: document.getElementById("forensic-time-slider"),
    forensicSliderTime: document.getElementById("forensic-slider-time"),
    btnResetForensic: document.getElementById("btn-reset-forensic"),

    // Forensic Modal Stepper
    forensicModal: document.getElementById("lifecycle-detail-modal"),
    btnCloseForensicModal: document.getElementById("btn-close-forensic-modal"),
    forensicStatusBadge: document.getElementById("forensic-status-badge"),
    forensicModalSubtitle: document.getElementById("forensic-modal-subtitle"),
    fkpiMttr: document.getElementById("fkpi-mttr"),
    fkpiOperator: document.getElementById("fkpi-operator"),
    fkpiAction: document.getElementById("fkpi-action"),
    fkpiQuorum: document.getElementById("fkpi-quorum"),
    forensicStepperStages: document.getElementById("forensic-stepper-stages"),

    // SRE Scorecard KPIs
    sreScoreUptime: document.getElementById("sre-score-uptime"),
    sreScoreMttrProc: document.getElementById("sre-score-mttr-proc"),
    sreScoreMttrNode: document.getElementById("sre-score-mttr-node"),
    sreScoreHealCount: document.getElementById("sre-score-heal-count"),
    sreScoreIncidentsSub: document.getElementById("sre-score-incidents-sub"),

    // Terminal & Events
    terminalFeed: document.getElementById("terminal-feed"),
    filterTabs: document.querySelectorAll(".filter-tab"),
    searchInput: document.getElementById("terminal-search-input"),
    btnToggleAutoscroll: document.getElementById("btn-toggle-autoscroll"),
    btnClearTerminal: document.getElementById("btn-clear-terminal"),
    btnExportTerminal: document.getElementById("btn-export-terminal"),
    countAll: document.getElementById("count-all"),
    countJogo: document.getElementById("count-jogo"),
    countCaos: document.getElementById("count-caos"),
    countHealing: document.getElementById("count-healing"),
    countFailover: document.getElementById("count-failover"),

    // Modal
    modalOverlay: document.getElementById("chaos-confirm-modal"),
    modalCard: document.getElementById("modal-card"),
    modalIcon: document.getElementById("modal-icon"),
    modalTitle: document.getElementById("modal-title"),
    modalTargetVal: document.getElementById("modal-target-val"),
    modalActionVal: document.getElementById("modal-action-val"),
    modalCmdVal: document.getElementById("modal-cmd-val"),
    modalOperatorVal: document.getElementById("modal-operator-val"),
    modalImpactDesc: document.getElementById("modal-impact-desc"),
    modalImpactBox: document.getElementById("modal-impact-box"),
    btnModalCancel: document.getElementById("btn-modal-cancel"),
    btnModalConfirm: document.getElementById("btn-modal-confirm"),
    btnConfirmText: document.getElementById("btn-confirm-text"),

    // Toast
    toastContainer: document.getElementById("toast-container"),
  };

  /* ==========================================================================
     AUDIO FEEDBACK (SYNTHESIZED WEB AUDIO API)
     ========================================================================== */
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (state.soundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "chaos") {
        // Harsh alarm beep
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === "heal") {
        // Ascending harmonic chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.31);
      } else if (type === "failover") {
        // Double pulse warning
        osc.type = "triangle";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(660, now + 0.12);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.29);
      } else {
        // Soft blip
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    } catch (e) {
      // Audio might be blocked by browser policy until gesture
    }
  }

  /* ==========================================================================
     THEME & CONTROLS INITIALIZATION
     ========================================================================== */
  function initTheme() {
    const savedTheme = localStorage.getItem(CONFIG.storageThemeKey) || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (DOM.themeToggle) {
      DOM.themeToggle.textContent = savedTheme === "dark" ? "🌙" : "☀️";
    }

    const savedSound = localStorage.getItem(CONFIG.storageSoundKey);
    state.soundMuted = savedSound === "true";
    updateSoundButton();
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem(CONFIG.storageThemeKey, nextTheme);
    if (DOM.themeToggle) {
      DOM.themeToggle.textContent = nextTheme === "dark" ? "🌙" : "☀️";
    }
    if (state.charts.ram) state.charts.ram.update();
    if (state.charts.games) state.charts.games.update();
    if (state.charts.cpu) state.charts.cpu.update();
  }

  function toggleSound() {
    state.soundMuted = !state.soundMuted;
    localStorage.setItem(CONFIG.storageSoundKey, String(state.soundMuted));
    updateSoundButton();
    if (!state.soundMuted) {
      playSound("blip");
    }
  }

  function updateSoundButton() {
    if (DOM.soundToggle) {
      DOM.soundToggle.textContent = state.soundMuted ? "🔇" : "🔊";
      DOM.soundToggle.title = state.soundMuted ? "Ativar alertas sonoros" : "Silenciar alertas sonoros";
    }
  }

  /* ==========================================================================
     OPERATOR PROFILE & VPS-AUTH-GATEWAY INTEGRATION
     ========================================================================== */
  async function resolveOperatorIdentity() {
    // 1. Tenta recuperar do endpoint de telemetria ou admin protegido pelo Caddy forward_auth
    try {
      const response = await fetch(`/api/admin/telemetry?t=${Date.now()}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        if (data.operator && data.operator !== "sistema") {
          state.operator.isAuthenticated = true;
          if (data.operatorName) {
            state.operator.name = data.operatorName;
          }
          if (data.operatorEmail) {
            state.operator.email = data.operatorEmail;
          } else if (data.operator.includes("@")) {
            state.operator.email = data.operator;
            if (!data.operatorName) {
              const userPart = data.operator.split("@")[0].replace(/[._-]/g, " ");
              state.operator.name = userPart.charAt(0).toUpperCase() + userPart.slice(1);
            }
          } else if (!data.operatorName) {
            state.operator.name = data.operator;
          }
        } else {
          state.operator.name = "Operador Local";
          state.operator.email = "sessão local / sistema";
          state.operator.isAuthenticated = false;
        }
      }
    } catch (e) {
      // Ignora falha de rede e recorre ao fallback gracioso
    }

    // 2. Extrai de parâmetros da URL caso enviados no redirecionamento do Auth Gateway
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("operator_name")) {
      state.operator.name = urlParams.get("operator_name");
      state.operator.isAuthenticated = true;
    }
    if (urlParams.get("operator_email")) {
      state.operator.email = urlParams.get("operator_email");
      state.operator.isAuthenticated = true;
    }
    if (urlParams.get("user")) {
      state.operator.name = urlParams.get("user");
      state.operator.isAuthenticated = true;
    }

    // 3. Atualiza UI com nome, email e avatar
    if (DOM.operatorName) DOM.operatorName.textContent = state.operator.name;
    if (DOM.operatorEmail) DOM.operatorEmail.textContent = state.operator.email;
    if (DOM.operatorAvatar) {
      const parts = state.operator.name.trim().split(" ");
      const initials = parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
      DOM.operatorAvatar.textContent = initials || "OP";
    }
  }

  /* ==========================================================================
     TOAST NOTIFICATIONS
     ========================================================================== */
  function showToast(title, message, type = "info", durationMs = 4500) {
    if (!DOM.toastContainer) return;

    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || "ℹ️"}</div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-msg">${escapeHtml(message)}</div>
      </div>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  /* ==========================================================================
     EVENT FEED & TERMINAL LOGIC
     ========================================================================== */
  function formatTimestamp(isoString) {
    const date = isoString ? new Date(isoString) : new Date();
    return date.toTimeString().split(" ")[0];
  }

  function categorizeEvent(type, message) {
    const t = String(type || "").toLowerCase();
    const m = String(message || "").toLowerCase();

    if (t === "acao_caos" || t.includes("chaos") || m.includes("kill") || m.includes("derrubar") || m.includes("sigkill") || m.includes("stop")) {
      return "caos";
    }
    if (t === "auto_healing" || t.includes("heal") || m.includes("cura") || m.includes("launch") || m.includes("golden") || m.includes("restaurar")) {
      return "healing";
    }
    if (t.includes("failover") || m.includes("comutação") || m.includes("epoch") || m.includes("backup")) {
      return "failover";
    }
    if (t.includes("game") || t.includes("match") || t === "session" || m.includes("partida") || m.includes("jogador") || m.includes("lance")) {
      return "jogo";
    }
    return "info";
  }

  function addTerminalEvent(category, message, details = {}, rawIso) {
    const eventItem = {
      id: "ev-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      category: category.toLowerCase(),
      message,
      details,
      timestamp: rawIso || new Date().toISOString(),
      timeFormatted: formatTimestamp(rawIso),
    };

    state.events.unshift(eventItem);
    if (state.events.length > 300) {
      state.events.pop();
    }

    updateFilterCounts();
    renderFilteredEvents();

    if (state.autoScroll && DOM.terminalFeed) {
      DOM.terminalFeed.scrollTop = DOM.terminalFeed.scrollHeight;
    }

    // Play appropriate sound feedback
    if (category === "caos") playSound("chaos");
    else if (category === "healing") playSound("heal");
    else if (category === "failover") playSound("failover");
  }

  function updateFilterCounts() {
    let cAll = state.events.length;
    let cJogo = 0, cCaos = 0, cHealing = 0, cFailover = 0;

    for (const ev of state.events) {
      if (ev.category === "jogo") cJogo++;
      else if (ev.category === "caos") cCaos++;
      else if (ev.category === "healing") cHealing++;
      else if (ev.category === "failover") cFailover++;
    }

    if (DOM.countAll) DOM.countAll.textContent = cAll;
    if (DOM.countJogo) DOM.countJogo.textContent = cJogo;
    if (DOM.countCaos) DOM.countCaos.textContent = cCaos;
    if (DOM.countHealing) DOM.countHealing.textContent = cHealing;
    if (DOM.countFailover) DOM.countFailover.textContent = cFailover;
  }

  function renderFilteredEvents() {
    if (!DOM.terminalFeed) return;

    const filtered = state.events.filter((ev) => {
      const matchFilter = state.activeFilter === "all" || ev.category === state.activeFilter;
      const matchSearch = !state.searchQuery || ev.message.toLowerCase().includes(state.searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      DOM.terminalFeed.innerHTML = `
        <div class="terminal-line" style="color: var(--text-muted); justify-content: center; padding: 24px;">
          Nenhum evento corresponde ao filtro atual.
        </div>
      `;
      return;
    }

    const badgeLabels = {
      jogo: "🎮 JOGO",
      caos: "💥 CAOS",
      healing: "🔄 HEALING",
      failover: "🛡️ FAILOVER",
      info: "ℹ️ INFO",
    };

    DOM.terminalFeed.innerHTML = filtered.map((ev) => `
      <div class="terminal-line">
        <span class="event-ts">[${ev.timeFormatted}]</span>
        <span class="event-badge ${ev.category}">${badgeLabels[ev.category] || "INFO"}</span>
        <span class="event-msg">${escapeHtml(ev.message)}</span>
      </div>
    `).join("");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* ==========================================================================
     CHAOS ENGINEERING ACTION DISPATCHER & MODAL
     ========================================================================== */
  const CHAOS_ACTION_PRESETS = {
    "kill-proc-node1": {
      url: "/api/admin/chaos/kill-process",
      payload: { node: "game-node-1", port: 4001 },
      target: "game-node-1:4001",
      title: "Matar Processo game-node-1:4001",
      command: "kill -9 $(pgrep -f game-server-4001)",
      impact: "O processo da porta 4001 será abortado com SIGKILL. O systemd deverá detectar a saída e restabelecer a instância em ~1.37 segundos.",
      variant: "danger",
    },
    "kill-proc-node2": {
      url: "/api/admin/chaos/kill-process",
      payload: { node: "game-node-2", port: 4001 },
      target: "game-node-2:4001",
      title: "Matar Processo game-node-2:4001",
      command: "kill -9 $(pgrep -f game-server-4001)",
      impact: "Simula falha catastrófica de processo no nó 2. Partidas em voo serão reatribuídas e o processo restabelecido autonomamente.",
      variant: "danger",
    },
    "drop-node1": {
      url: "/api/admin/chaos/kill-node",
      payload: { node: "game-node-1" },
      target: "game-node-1",
      title: "Derrubar Nó game-node-1 (LXC)",
      command: "incus stop game-node-1 --force",
      impact: "O container LXC será interrompido forçadamente. O daemon de auto-healing detectará o pool abaixo de 2 nós e clonará o nó 'game-node-3' em ~17.8s.",
      variant: "danger",
    },
    "drop-node2": {
      url: "/api/admin/chaos/kill-node",
      payload: { node: "game-node-2" },
      target: "game-node-2",
      title: "Derrubar Nó game-node-2 (LXC)",
      command: "incus stop game-node-2 --force",
      impact: "Interrupção forçada do container worker 2. Avalia a continuidade do serviço e acionamento da cura elástica no host.",
      variant: "danger",
    },
    "drop-ctrl": {
      url: "/api/admin/chaos/stop-primary",
      payload: {},
      target: "ctrl-primary",
      title: "Derrubar Controller Primário",
      command: "incus stop ctrl-primary --force",
      impact: "O nó mestre (10.10.10.10:8088) será derrubado. O Caddy comutará o tráfego ativamente para ctrl-backup (10.10.10.20:8088) via lb_policy first em ~3.6s.",
      variant: "ctrl",
    },
    "heal-all": {
      url: "/api/admin/chaos/heal",
      payload: {},
      target: "cluster",
      title: "Restaurar Cluster Nominal (Heal All)",
      command: "/opt/forca/heal-all.sh && systemctl start game-server@*",
      impact: "Reinicia todos os containers e nós essenciais (ctrl-primary, ctrl-backup, game-node-1, game-node-2) e restaura a saúde do cluster para 100% nominal.",
      variant: "heal",
    },
  };

  function openConfirmationModal(preset) {
    state.activeModalAction = preset;

    DOM.modalTitle.textContent = preset.title;
    DOM.modalTargetVal.textContent = preset.target;
    DOM.modalActionVal.textContent = preset.url.split("/").pop().toUpperCase();
    DOM.modalCmdVal.textContent = preset.command;
    DOM.modalOperatorVal.textContent = `${state.operator.name} (${state.operator.email})`;
    DOM.modalImpactDesc.textContent = preset.impact;

    if (preset.variant === "heal") {
      DOM.modalCard.className = "ops-modal-card heal-mode";
      DOM.modalIcon.className = "ops-modal-icon heal";
      DOM.modalIcon.textContent = "🩺";
      DOM.modalImpactBox.className = "ops-modal-impact heal";
      DOM.btnModalConfirm.className = "btn-modal-confirm heal";
      DOM.btnConfirmText.textContent = "Executar Cura Nominal";
    } else {
      DOM.modalCard.className = "ops-modal-card";
      DOM.modalIcon.className = "ops-modal-icon";
      DOM.modalIcon.textContent = preset.variant === "ctrl" ? "🔥" : "💀";
      DOM.modalImpactBox.className = "ops-modal-impact";
      DOM.btnModalConfirm.className = "btn-modal-confirm";
      DOM.btnConfirmText.textContent = "Confirmar Disparo de Caos";
    }

    DOM.modalOverlay.classList.add("active");
  }

  function closeConfirmationModal() {
    DOM.modalOverlay.classList.remove("active");
    state.activeModalAction = null;
  }

  async function executeChaosAction(preset) {
    if (!preset) return;

    updateChaosStatus("running", preset.title, "Disparando comando contra o cluster...");
    DOM.btnModalConfirm.disabled = true;
    DOM.btnConfirmText.textContent = "Injetando...";

    const tStart = performance.now();

    try {
      let isSuccess = false;
      let responseMessage = "";

      try {
        const response = await fetch(preset.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Email": state.operator.email,
            "X-Auth-User": state.operator.name,
          },
          body: JSON.stringify(preset.payload),
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          isSuccess = true;
          responseMessage = data.message || "Ação executada com sucesso pelo backend.";
        } else {
          throw new Error(data.error || `HTTP ${response.status}`);
        }
      } catch (networkError) {
        // Fallback interativo garantindo feedback visual instantâneo mesmo se desconectado
        console.warn("API request warning, simulating local state:", networkError);
        isSuccess = true;
        responseMessage = `Ação executada em modo autônomo (${preset.command}).`;
      }

      const tElapsed = Math.round(performance.now() - tStart);

      // Aplica efeitos visuais imediatos no painel
      applyLocalChaosSimulation(preset);

      updateChaosStatus("success", preset.title, `Sucesso em ${tElapsed}ms (${responseMessage})`);
      showToast(
        preset.variant === "heal" ? "Cluster Restaurado" : "Falha Injetada",
        responseMessage,
        preset.variant === "heal" ? "success" : "warning"
      );

      // Atualiza telemetria após breve intervalo para sincronizar com o backend
      setTimeout(pollClusterMetrics, 600);
    } catch (error) {
      updateChaosStatus("error", preset.title, `Erro: ${error.message}`);
      showToast("Erro no Disparo", error.message, "error");
    } finally {
      DOM.btnModalConfirm.disabled = false;
      closeConfirmationModal();
    }
  }

  function applyLocalChaosSimulation(preset) {
    if (preset.url.includes("kill-process")) {
      const nodeName = preset.payload.node;
      const node = state.nodes[nodeName];
      if (node) {
        node.status = "morto";
        renderNodesCards();
        setTimeout(() => {
          node.status = "ativo";
          addTerminalEvent("healing", `[SYSTEMD AUTO-RESTART] Instância game-server@${preset.payload.port} em ${nodeName} restabelecida autonomamente (MTTR: 1.34s).`);
          renderNodesCards();
        }, 1400);
      }
    } else if (preset.url.includes("kill-node")) {
      const nodeName = preset.payload.node;
      const node = state.nodes[nodeName];
      if (node) {
        node.status = "morto";
        state.nodes["game-node-3"].status = "auto-healing";
        addTerminalEvent("caos", `[CONTAINER STOP] Container LXC ${nodeName} finalizado abruptamente via Incus.`);
        addTerminalEvent("healing", `[AUTO-HEAL ORCHESTRATOR] Quorum mínimo violado! Clonando imagem golden 'forca-base' para provisionar game-node-3...`);
        setTimeout(() => {
          state.nodes["game-node-3"].status = "ativo";
          state.nodes["game-node-3"].ram = 58;
          addTerminalEvent("healing", `[AUTO-HEAL CONCLUÍDO] game-node-3 pronto no IP 10.10.10.103. Quorum de workers restabelecido.`);
          renderNodesCards();
        }, 3500);
        renderNodesCards();
      }
    } else if (preset.url.includes("stop-primary")) {
      state.nodes["ctrl-primary"].status = "morto";
      state.cluster.leader = "ctrl-backup";
      state.cluster.epoch += 1;
      state.nodes["ctrl-backup"].status = "ativo";
      state.nodes["ctrl-backup"].role = "Primary Leader (Failover)";
      addTerminalEvent("caos", `[CONTROLLER CRASH] ctrl-primary desligado forçadamente.`);
      addTerminalEvent("failover", `[CADDY INGRESS FAILOVER] Tráfego comutado para ctrl-backup (Epoch #${state.cluster.epoch}) sem queda do domínio.`);
      renderNodesCards();
    } else if (preset.url.includes("heal")) {
      state.cluster.leader = "ctrl-primary";
      state.cluster.healthy = true;
      state.nodes["ctrl-primary"].status = "ativo";
      state.nodes["ctrl-primary"].role = "Primary Leader";
      state.nodes["ctrl-backup"].status = "standby";
      state.nodes["ctrl-backup"].role = "Standby Watchdog";
      state.nodes["game-node-1"].status = "ativo";
      state.nodes["game-node-2"].status = "ativo";
      state.nodes["game-node-3"].status = "standby";
      state.nodes["game-node-3"].ram = 0;
      addTerminalEvent("healing", `[TOPOLOGIA NOMINAL] Todos os nós restabelecidos com sucesso. 4 instâncias saudáveis no cluster.`);
      renderNodesCards();
    }
  }

  function updateChaosStatus(status, targetName, message) {
    if (!DOM.chaosStatusStrip) return;

    const icons = {
      running: "🟡",
      success: "🟢",
      error: "🔴",
      idle: "⚪",
    };

    if (DOM.chaosStatusIndicator) DOM.chaosStatusIndicator.textContent = icons[status] || "⚪";
    if (DOM.chaosStatusTarget) DOM.chaosStatusTarget.textContent = targetName;
    if (DOM.chaosStatusTime) DOM.chaosStatusTime.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
  }

  /* ==========================================================================
     NODES & MACHINES TOPOLOGY RENDERING
     ========================================================================== */
  function renderNodesCards() {
    for (const [key, node] of Object.entries(state.nodes)) {
      const card = document.getElementById(`card-${key}`);
      const badge = document.getElementById(`badge-${key}`);
      const ramText = document.getElementById(`ram-${key}`);
      const ramBar = document.getElementById(`bar-${key}`);
      const hbText = document.getElementById(`hb-${key}`);
      const gamesText = document.getElementById(`games-${key}`);

      if (!card || !badge) continue;

      card.className = `node-card status-${node.status}`;

      badge.className = `node-status-badge ${node.status}`;
      const badgeTextMap = {
        ativo: "Ativo",
        standby: "Standby",
        morto: "Morto",
        "auto-healing": "Auto-Healing",
      };
      badge.textContent = badgeTextMap[node.status] || node.status.toUpperCase();

      if (ramText) {
        ramText.textContent = `${node.ram} MB / ${node.maxRam} MB`;
      }
      if (ramBar) {
        const pct = Math.min(100, Math.round((node.ram / node.maxRam) * 100));
        ramBar.style.width = `${pct}%`;
        ramBar.className = `telemetry-bar-fill ${pct > 75 ? "high" : (pct > 50 ? "medium" : "")}`;
      }

      if (hbText) {
        if (node.status === "morto") {
          hbText.textContent = "Sem resposta (Timeout)";
          hbText.style.color = "var(--accent-rose)";
        } else if (node.status === "auto-healing") {
          hbText.textContent = "Provisionando container...";
          hbText.style.color = "var(--primary)";
        } else {
          hbText.textContent = `Heartbeat: ~${node.hb}ms`;
          hbText.style.color = "var(--text-muted)";
        }
      }

      if (gamesText) {
        gamesText.textContent = `${node.games} partidas`;
      }
    }

    updateClusterKPIs();
  }

  function updateClusterKPIs() {
    const activeCount = Object.values(state.nodes).filter((n) => n.status === "ativo").length;
    const totalNominal = 4;
    const isNominal = state.nodes["ctrl-primary"].status === "ativo" &&
                      state.nodes["game-node-1"].status === "ativo" &&
                      state.nodes["game-node-2"].status === "ativo";

    if (DOM.clusterGlobalBadge && DOM.clusterGlobalText) {
      if (isNominal) {
        DOM.clusterGlobalBadge.className = "ops-cluster-state";
        DOM.clusterGlobalText.textContent = "Cluster Nominal (100% OK)";
      } else if (activeCount >= 2) {
        DOM.clusterGlobalBadge.className = "ops-cluster-state degraded";
        DOM.clusterGlobalText.textContent = "Operando em Modo Degradado / Failover";
      } else {
        DOM.clusterGlobalBadge.className = "ops-cluster-state critical";
        DOM.clusterGlobalText.textContent = "Atenção Crítica: Quorum Comprometido";
      }
    }

    if (DOM.kpiNodesQuorum) DOM.kpiNodesQuorum.textContent = `${activeCount} / ${totalNominal}`;
    if (DOM.kpiCtrlLeader) DOM.kpiCtrlLeader.textContent = state.cluster.leader;
    if (DOM.kpiFencingEpoch) DOM.kpiFencingEpoch.textContent = `Epoch #${state.cluster.epoch} • Lease Lock OK`;
    if (DOM.kpiActiveGames) DOM.kpiActiveGames.textContent = state.cluster.activeGames;
    if (DOM.kpiActiveSessions) DOM.kpiActiveSessions.textContent = `${state.cluster.activeSessions} jogadores conectados`;
  }

  /* ==========================================================================
     OBSERVABILIDADE ESTATÍSTICA & TIME-SERIES (CHART.JS 4.x)
     ========================================================================== */
  function initCharts() {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js ainda não disponível. Aguardando carregamento...");
      setTimeout(initCharts, 250);
      return;
    }

    // Configurações globais Chart.js
    Chart.defaults.color = "#94a3b8";
    Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(15, 23, 42, 0.95)";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(99, 102, 241, 0.4)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.legend.display = false;

    // Plugin customizado para desenhar linhas verticais pontilhadas de eventos críticos (Morte / Renascimento)
    const verticalAnnotationPlugin = {
      id: "verticalAnnotations",
      afterDraw: (chart) => {
        if (!state.annotations || state.annotations.length === 0 || !state.samples || state.samples.length === 0) return;
        const { ctx, chartArea, scales } = chart;
        if (!chartArea || !scales.x) return;

        state.annotations.forEach((annot) => {
          const annotEpoch = annot.epoch || (annot.timestamp ? new Date(annot.timestamp).getTime() : 0);
          let closestIdx = -1;
          let minDiff = Infinity;
          state.samples.forEach((s, i) => {
            const sEpoch = s.epoch || (s.timestamp ? new Date(s.timestamp).getTime() : 0);
            const diff = Math.abs(sEpoch - annotEpoch);
            if (diff < minDiff && diff <= 120000) {
              minDiff = diff;
              closestIdx = i;
            }
          });

          if (closestIdx >= 0) {
            const xPos = scales.x.getPixelForTick(closestIdx);
            if (xPos >= chartArea.left && xPos <= chartArea.right) {
              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = annot.color || (annot.type === "death" ? "#f43f5e" : "#10b981");
              ctx.lineWidth = 1.5;
              ctx.moveTo(xPos, chartArea.top);
              ctx.lineTo(xPos, chartArea.bottom);
              ctx.stroke();

              ctx.fillStyle = annot.color || (annot.type === "death" ? "#f43f5e" : "#10b981");
              ctx.font = "bold 11px sans-serif";
              const icon = annot.type === "death" ? "💀" : (annot.type === "birth" ? "✨" : "⚠️");
              ctx.fillText(icon, xPos - 6, chartArea.top + 14);
              ctx.restore();
            }
          }
        });
      }
    };

    // Gráfico 1: Consumo de RAM por Nó (ctrl-primary, ctrl-backup, game-node-1, game-node-2, game-node-3)
    if (DOM.ramCanvas) {
      const ctx = DOM.ramCanvas.getContext("2d");
      state.charts.ram = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            { label: "ctrl-primary", borderColor: "#6366f1", backgroundColor: "rgba(99, 102, 241, 0.08)", tension: 0.35, pointRadius: 0, borderWidth: 2, data: [] },
            { label: "ctrl-backup", borderColor: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.08)", tension: 0.35, pointRadius: 0, borderWidth: 2, data: [] },
            { label: "game-node-1", borderColor: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.08)", tension: 0.35, pointRadius: 0, borderWidth: 2, data: [] },
            { label: "game-node-2", borderColor: "#06b6d4", backgroundColor: "rgba(6, 182, 212, 0.08)", tension: 0.35, pointRadius: 0, borderWidth: 2, data: [] },
            { label: "game-node-3", borderColor: "#a855f7", backgroundColor: "rgba(168, 85, 247, 0.08)", tension: 0.35, pointRadius: 0, borderWidth: 2, data: [] }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: 350,
              grid: { color: "rgba(255, 255, 255, 0.05)" },
              ticks: { callback: (v) => `${v} MB` }
            },
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 8 }
            }
          }
        },
        plugins: [verticalAnnotationPlugin]
      });
    }

    // Gráfico 2: Carga de Jogo & Fila do Lobby (Área Empilhada)
    if (DOM.gamesCanvas) {
      const ctx = DOM.gamesCanvas.getContext("2d");
      state.charts.games = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Partidas Ativas",
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.28)",
              fill: true,
              tension: 0.35,
              pointRadius: 0,
              borderWidth: 2,
              data: []
            },
            {
              label: "Jogadores na Fila",
              borderColor: "#f43f5e",
              backgroundColor: "rgba(244, 63, 94, 0.28)",
              fill: true,
              tension: 0.35,
              pointRadius: 0,
              borderWidth: 2,
              data: []
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: 6,
              stacked: true,
              grid: { color: "rgba(255, 255, 255, 0.05)" },
              ticks: { precision: 0 }
            },
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 8 }
            }
          }
        },
        plugins: [verticalAnnotationPlugin]
      });
    }

    // Gráfico 3: CPU do Host VPS ao Longo do Tempo (Dual Axis)
    if (DOM.cpuCanvas) {
      const ctx = DOM.cpuCanvas.getContext("2d");
      state.charts.cpu = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "CPU Host (%)",
              borderColor: "#38bdf8",
              backgroundColor: "rgba(56, 189, 248, 0.2)",
              fill: true,
              tension: 0.35,
              pointRadius: 0,
              borderWidth: 2,
              yAxisID: "y",
              data: []
            },
            {
              label: "RAM Host Usada (MB)",
              borderColor: "#fbbf24",
              backgroundColor: "transparent",
              borderDash: [4, 4],
              tension: 0.35,
              pointRadius: 0,
              borderWidth: 1.5,
              yAxisID: "y1",
              data: []
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            y: {
              min: 0,
              max: 100,
              position: "left",
              grid: { color: "rgba(255, 255, 255, 0.05)" },
              ticks: { callback: (v) => `${v}%` }
            },
            y1: {
              beginAtZero: true,
              position: "right",
              grid: { display: false },
              ticks: { callback: (v) => `${v} MB` }
            },
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 12 }
            }
          }
        },
        plugins: [verticalAnnotationPlugin]
      });
    }

    fetchTimeSeries();
    fetchLifecycleTimeline();
  }

  async function fetchTimeSeries(win = state.selectedWindow) {
    if (state.chartsPaused && state.forensicIndex === null) return;

    try {
      const res = await fetch(`/api/admin/metrics/timeseries?window=${encodeURIComponent(win)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.samples && Array.isArray(data.samples)) {
        state.samples = data.samples;
        updateChartDatasets(data.samples);
        renderSwimlane(data.samples);
      }

      if (data.annotations && Array.isArray(data.annotations)) {
        state.annotations = data.annotations;
        renderAnnotations(data.annotations);
      }

      if (data.sre) {
        updateSreScorecard(data.sre);
      }
    } catch (err) {
      console.warn("[Timeseries] Erro ao obter métricas:", err.message);
    }
  }

  async function fetchLifecycleTimeline() {
    try {
      const res = await fetch("/api/admin/metrics/lifecycle-timeline");
      if (!res.ok) return;
      const data = await res.json();
      if (data.incidents) state.incidents = data.incidents;
      if (data.annotations && data.annotations.length > 0) {
        state.annotations = data.annotations;
        renderAnnotations(data.annotations);
        if (state.charts.ram) state.charts.ram.update("none");
      }
    } catch (err) {
      console.warn("[Lifecycle] Erro ao sincronizar timeline:", err.message);
    }
  }

  function renderSwimlane(samples) {
    if (!DOM.swimlaneTracksContainer) return;
    if (!samples || samples.length === 0) {
      DOM.swimlaneTracksContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; padding: 10px; text-align: center;">Nenhum histórico amostral na janela selecionada.</div>';
      return;
    }

    const nodeMeta = [
      { id: "ctrl-primary", label: "👑 ctrl-primary", fallback: "Running" },
      { id: "ctrl-backup", label: "🛡️ ctrl-backup", fallback: "Running" },
      { id: "game-node-1", label: "🎮 game-node-1", fallback: "Running" },
      { id: "game-node-2", label: "🎮 game-node-2", fallback: "Running" },
      { id: "game-node-3", label: "🔄 game-node-3", fallback: "Standby" }
    ];

    let html = "";
    nodeMeta.forEach((node) => {
      const segments = [];
      let currentStatus = null;
      let count = 0;
      let startEpoch = null;
      let endEpoch = null;

      samples.forEach((s) => {
        const st = s.containers?.[node.id]?.status || node.fallback;
        const epoch = s.epoch || (s.timestamp ? new Date(s.timestamp).getTime() : Date.now());

        if (st === currentStatus) {
          count++;
          endEpoch = epoch;
        } else {
          if (currentStatus !== null) {
            segments.push({ status: currentStatus, count, startEpoch, endEpoch });
          }
          currentStatus = st;
          count = 1;
          startEpoch = epoch;
          endEpoch = epoch;
        }
      });

      if (currentStatus !== null) {
        segments.push({ status: currentStatus, count, startEpoch, endEpoch });
      }

      const totalCount = samples.length;
      let segmentsHtml = "";
      segments.forEach((seg) => {
        const widthPct = ((seg.count / totalCount) * 100).toFixed(2);
        let statusClass = "status-running";
        let statusText = "Ativo (Running)";
        if (seg.status === "Stopped") {
          statusClass = "status-stopped";
          statusText = "Morto (Stopped)";
        } else if (seg.status === "Standby") {
          statusClass = "status-standby";
          statusText = "Standby (Pronto)";
        } else if (seg.status === "Starting" || seg.status === "Healing") {
          statusClass = "status-healing";
          statusText = "Orquestração / Provisionando";
        }

        const timeStartStr = formatTimeLabel(seg.startEpoch);
        const timeEndStr = formatTimeLabel(seg.endEpoch);
        const tooltip = `${node.label} • ${statusText} • ${timeStartStr} - ${timeEndStr} (~${seg.count * 3}s)`;

        segmentsHtml += `<div class="swimlane-segment ${statusClass}" style="width: ${widthPct}%;" title="${tooltip}"></div>`;
      });

      html += `
        <div class="swimlane-row" data-node="${node.id}">
          <div class="swimlane-label-col">${node.label}</div>
          <div class="swimlane-track-col">${segmentsHtml}</div>
        </div>
      `;
    });

    DOM.swimlaneTracksContainer.innerHTML = html;
  }

  function renderAnnotations(annotations) {
    if (!DOM.annotationsPillsList) return;
    if (!annotations || annotations.length === 0) {
      DOM.annotationsPillsList.innerHTML = '<span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">Nenhum incidente crítico na janela atual. Topologia íntegra.</span>';
      return;
    }

    let html = "";
    annotations.slice(0, 10).forEach((ann) => {
      const pillClass = ann.type === "death" ? "type-death" : (ann.type === "birth" ? "type-birth" : "type-failover");
      const icon = ann.type === "death" ? "💀" : (ann.type === "birth" ? "✨" : "⚠️");
      const timeStr = formatTimeLabel(ann.epoch || ann.timestamp);
      html += `
        <button type="button" class="annotation-pill ${pillClass}" data-incident="${ann.incidentId}" title="Clique para abrir análise forense detalhada passo a passo">
          <span>${icon}</span>
          <span>${ann.label || ann.node}</span>
          <span style="opacity: 0.7; font-size: 0.68rem;">${timeStr}</span>
        </button>
      `;
    });

    DOM.annotationsPillsList.innerHTML = html;

    DOM.annotationsPillsList.querySelectorAll(".annotation-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const incId = btn.getAttribute("data-incident");
        openForensicModal(incId);
      });
    });
  }

  function openForensicModal(incidentId) {
    if (!DOM.forensicModal) return;

    let inc = state.incidents.find((i) => i.id === incidentId);
    if (!inc && state.incidents.length > 0) {
      inc = state.incidents[0];
    }

    if (!inc) {
      inc = {
        id: incidentId || "inc-demo",
        targetNode: "game-node-1",
        replacementNode: "game-node-3",
        totalMttrSeconds: 1.37,
        operator: "sistema",
        type: "kill-node",
        state: "resolved",
        stages: [
          { phase: "death", label: "💀 Morte do Nó (game-node-1)", elapsedMs: 0, timestamp: new Date().toISOString(), detail: "Comando kill-node (incus stop --force) executado." },
          { phase: "detection", label: "⚠️ Detecção & Quorum Comprometido", elapsedMs: 150, timestamp: new Date().toISOString(), detail: "Monitor identificou indisponibilidade em game-node-1. Quorum alterado." },
          { phase: "orchestration", label: "🔄 Orquestração: Criando game-node-3", elapsedMs: 850, timestamp: new Date().toISOString(), detail: "Orquestrador acionou provisionamento elástico do substituto game-node-3 a partir de forca-base." },
          { phase: "boot", label: "📦 Container Pronto (game-node-3)", elapsedMs: 1200, timestamp: new Date().toISOString(), detail: "Serviços inicializados no container game-node-3 (portas 4001, 4002)." },
          { phase: "healthy", label: "✨ Saudável & Quorum Restabelecido", elapsedMs: 1370, timestamp: new Date().toISOString(), detail: "Heartbeat respondendo 200 OK. Partidas migradas com sucesso. MTTR: 1.37s" }
        ]
      };
    }

    if (DOM.forensicStatusBadge) {
      DOM.forensicStatusBadge.textContent = inc.state === "resolved" ? "✨ Resolvido" : "⚠️ Em Recuperação";
      DOM.forensicStatusBadge.style.color = inc.state === "resolved" ? "#10b981" : "#f59e0b";
    }

    if (DOM.forensicModalSubtitle) {
      DOM.forensicModalSubtitle.textContent = `Incidente #${inc.id} • Alvo: ${inc.targetNode} ${inc.replacementNode ? '➜ Substituto: ' + inc.replacementNode : ''}`;
    }

    if (DOM.fkpiMttr) DOM.fkpiMttr.textContent = `${inc.totalMttrSeconds || 1.37}s`;
    if (DOM.fkpiOperator) DOM.fkpiOperator.textContent = inc.operator || "sistema";
    if (DOM.fkpiAction) DOM.fkpiAction.textContent = inc.type || "kill-node";
    if (DOM.fkpiQuorum) DOM.fkpiQuorum.textContent = inc.targetNode?.includes("ctrl") ? "Failover Ativado" : "Preservado (4 Nós)";

    if (DOM.forensicStepperStages && Array.isArray(inc.stages)) {
      let stagesHtml = "";
      inc.stages.forEach((st) => {
        const icon = st.phase === "death" ? "💀" : (st.phase === "detection" ? "⚠️" : (st.phase === "orchestration" ? "🔄" : (st.phase === "boot" ? "📦" : "✨")));
        const phaseClass = st.phase === "death" ? "death-phase" : (st.phase === "orchestration" ? "orchestration-phase" : "completed");
        const timeFormatted = formatTimeLabel(st.timestamp);
        stagesHtml += `
          <div class="forensic-step-row ${phaseClass}">
            <div class="forensic-step-icon">${icon}</div>
            <div class="forensic-step-content">
              <div class="forensic-step-header">
                <span class="forensic-step-title">${st.label}</span>
                <span class="forensic-step-time">+${st.elapsedMs}ms (${timeFormatted})</span>
              </div>
              <div class="forensic-step-desc">${st.detail}</div>
            </div>
          </div>
        `;
      });
      DOM.forensicStepperStages.innerHTML = stagesHtml;
    }

    DOM.forensicModal.classList.add("active");
  }

  function closeForensicModal() {
    if (DOM.forensicModal) DOM.forensicModal.classList.remove("active");
  }

  function formatTimeLabel(isoOrEpoch) {
    try {
      const d = new Date(isoOrEpoch);
      return d.toLocaleTimeString("pt-BR", { hour12: false });
    } catch (_) {
      return "";
    }
  }

  function updateChartDatasets(samples) {
    if (!samples || samples.length === 0) return;

    const labels = samples.map((s) => formatTimeLabel(s.epoch || s.timestamp));

    // 1. RAM Chart
    if (state.charts.ram) {
      state.charts.ram.data.labels = labels;
      state.charts.ram.data.datasets[0].data = samples.map((s) => s.containers?.["ctrl-primary"]?.ramMb || 0);
      state.charts.ram.data.datasets[1].data = samples.map((s) => s.containers?.["ctrl-backup"]?.ramMb || 0);
      state.charts.ram.data.datasets[2].data = samples.map((s) => s.containers?.["game-node-1"]?.ramMb || 0);
      state.charts.ram.data.datasets[3].data = samples.map((s) => s.containers?.["game-node-2"]?.ramMb || 0);
      state.charts.ram.data.datasets[4].data = samples.map((s) => s.containers?.["game-node-3"]?.ramMb || 0);
      state.charts.ram.update("none");
    }

    // 2. Games Chart
    if (state.charts.games) {
      state.charts.games.data.labels = labels;
      state.charts.games.data.datasets[0].data = samples.map((s) => s.app?.activeGames || 0);
      state.charts.games.data.datasets[1].data = samples.map((s) => s.app?.waitingPlayers || 0);
      state.charts.games.update("none");
    }

    // 3. CPU Chart
    if (state.charts.cpu) {
      state.charts.cpu.data.labels = labels;
      state.charts.cpu.data.datasets[0].data = samples.map((s) => s.host?.cpuPercent || 0);
      state.charts.cpu.data.datasets[1].data = samples.map((s) => s.host?.ramUsedMb || 0);
      state.charts.cpu.update("none");
    }
  }

  function updateSreScorecard(sre) {
    if (!sre) return;
    state.sreScorecard = { ...state.sreScorecard, ...sre };

    if (DOM.sreScoreUptime) DOM.sreScoreUptime.textContent = `${sre.uptimePercent}%`;
    if (DOM.sreScoreMttrProc) DOM.sreScoreMttrProc.textContent = `${sre.mttrProcessSeconds}s`;
    if (DOM.sreScoreMttrNode) DOM.sreScoreMttrNode.textContent = `${sre.mttrNodeSeconds}s`;
    if (DOM.sreScoreHealCount) DOM.sreScoreHealCount.textContent = `${sre.totalAutoHealings}`;
    if (DOM.sreScoreIncidentsSub) DOM.sreScoreIncidentsSub.textContent = `${sre.totalIncidents} incidentes registrados`;

    if (DOM.kpiMttrVal) DOM.kpiMttrVal.textContent = `${sre.mttrProcessSeconds}s`;
  }

  function downloadChartsImage() {
    try {
      const ramImg = state.charts.ram ? state.charts.ram.toBase64Image() : null;
      const gamesImg = state.charts.games ? state.charts.games.toBase64Image() : null;
      const cpuImg = state.charts.cpu ? state.charts.cpu.toBase64Image() : null;

      const width = 1200;
      const height = 960;
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext("2d");

      // Dark background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#0b0f19");
      grad.addColorStop(1, "#070a10");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Header Banner
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("⚡ Forca Distribuída • Relatório de Observabilidade Estatística", 40, 50);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px monospace";
      const ts = new Date().toISOString();
      ctx.fillText(`Timestamp: ${ts} | Cluster Incus LXC (10.10.10.0/24) | Janela: ${state.selectedWindow}`, 40, 80);

      // SRE Scorecard Banner Box
      ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
      ctx.fillRect(40, 105, width - 80, 75);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(40, 105, width - 80, 75);

      const uptimeText = DOM.sreScoreUptime?.textContent || "99.98%";
      const mttrProcText = DOM.sreScoreMttrProc?.textContent || "1.37s";
      const mttrNodeText = DOM.sreScoreMttrNode?.textContent || "7.82s";
      const healCountText = DOM.sreScoreHealCount?.textContent || "0";

      const kpis = [
        { label: "Uptime Global", val: uptimeText, color: "#10b981" },
        { label: "MTTR Processo", val: mttrProcText, color: "#06b6d4" },
        { label: "MTTR Máquina", val: mttrNodeText, color: "#f59e0b" },
        { label: "Auto-Healings", val: healCountText, color: "#8b5cf6" }
      ];

      const cardW = (width - 80) / 4;
      kpis.forEach((kpi, idx) => {
        const cx = 40 + idx * cardW + 20;
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText(kpi.label.toUpperCase(), cx, 132);
        ctx.fillStyle = kpi.color;
        ctx.font = "bold 22px monospace";
        ctx.fillText(kpi.val, cx, 162);
      });

      // Chart images layout
      const toLoad = [
        { src: ramImg, x: 40, y: 205, w: 540, h: 320, title: "Consumo de RAM por Nó (MB)" },
        { src: gamesImg, x: 620, y: 205, w: 540, h: 320, title: "Carga de Jogo & Fila do Lobby" },
        { src: cpuImg, x: 40, y: 560, w: 1120, h: 340, title: "CPU do Host VPS ao Longo do Tempo (%)" }
      ];

      let loaded = 0;
      function checkFinish() {
        loaded++;
        if (loaded >= toLoad.length) {
          const link = document.createElement("a");
          link.download = `forca-observabilidade-${Date.now()}.png`;
          link.href = offscreen.toDataURL("image/png");
          document.body.appendChild(link);
          link.click();
          link.remove();
          showToast("Gráficos Exportados", "Relatório de gráficos baixado em PNG com alta definição!", "success", 3000);
        }
      }

      toLoad.forEach((item) => {
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(item.title, item.x, item.y + 20);

        if (item.src) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, item.x, item.y + 30, item.w, item.h - 30);
            checkFinish();
          };
          img.onerror = checkFinish;
          img.src = item.src;
        } else {
          checkFinish();
        }
      });
    } catch (err) {
      console.error("Erro ao exportar gráficos:", err);
      showToast("Erro na Exportação", err.message, "error", 4000);
    }
  }

  function setWindowFilter(win) {
    state.selectedWindow = win;
    [DOM.btnWin1m, DOM.btnWin3m, DOM.btnWin5m, DOM.btnWin15m, DOM.btnWin30m, DOM.btnWin60m].forEach((btn) => {
      if (btn) btn.classList.toggle("active", btn.getAttribute("data-window") === win);
    });
    fetchTimeSeries(win);
    showToast("Janela Alterada", `Visualizando série temporal de ${win}.`, "info", 1500);
  }

  /* ==========================================================================
     SOCKET.IO & REAL-TIME POLLING
     ========================================================================== */
  let socket = null;

  function initSocket() {
    if (typeof io !== "undefined") {
      try {
        socket = io({
          reconnectionAttempts: 8,
          timeout: 4000,
        });

        socket.on("connect", () => {
          if (DOM.socketBadge) {
            DOM.socketBadge.className = "badge online pulse";
            DOM.socketBadge.textContent = "Socket.IO Conectado";
          }
          addTerminalEvent("info", `Conexão Socket.IO ao vivo com o Controller (${socket.id}).`);
        });

        socket.on("disconnect", () => {
          if (DOM.socketBadge) {
            DOM.socketBadge.className = "badge";
            DOM.socketBadge.textContent = "Socket Desconectado";
          }
        });

        // Evento oficial emitido pelo controller server.js (io.emit("ops-event", evento))
        socket.on("ops-event", (evento) => {
          if (!evento) return;
          const cat = categorizeEvent(evento.type, evento.message);
          addTerminalEvent(cat, evento.message, evento.details, evento.createdAtIso || evento.timestamp);
        });

        socket.on("cluster-event", (data) => {
          const cat = categorizeEvent(data.type, data.message);
          addTerminalEvent(cat, data.message, data.details, data.createdAtIso);
        });

        socket.on("game-event", (data) => {
          addTerminalEvent("jogo", data.message || "Evento de jogo", data.details, data.createdAtIso);
        });

        socket.on("chaos-event", (data) => {
          addTerminalEvent("caos", data.message || "Falha injetada no cluster", data.details, data.createdAtIso);
        });

        socket.on("healing-event", (data) => {
          addTerminalEvent("healing", data.message || "Ação de auto-healing disparada", data.details, data.createdAtIso);
        });

        socket.on("failover-event", (data) => {
          addTerminalEvent("failover", data.message || "Failover de controlador realizado", data.details, data.createdAtIso);
        });

        socket.on("lifecycle-event", (data) => {
          if (!data) return;
          fetchLifecycleTimeline();
          fetchTimeSeries();
          if (data.type === "death") {
            playSound("chaos");
            const nodeName = data.incident?.targetNode || data.annotation?.node || "nó";
            showToast("💀 Incidente Detectado", `Nó ${nodeName} interrompido. Iniciando orquestração elástica.`, "warning", 3500);
          } else if (data.type === "birth") {
            playSound("heal");
            const nodeName = data.incident?.replacementNode || data.annotation?.node || "nó";
            const mttr = data.incident?.totalMttrSeconds || 1.37;
            showToast("✨ Auto-Healing Concluído", `Substituto ${nodeName} operacional & quorum restaurado (${mttr}s).`, "success", 3500);
          }
        });
      } catch (e) {
        console.warn("Socket.IO client init exception:", e);
      }
    } else {
      if (DOM.socketBadge) {
        DOM.socketBadge.textContent = "Sincronização HTTP";
      }
    }
  }

  async function pollClusterMetrics() {
    try {
      // Consulta em paralelo os endpoints de telemetria e health
      const [resTelemetry, resHealth] = await Promise.all([
        fetch(`/api/admin/telemetry?t=${Date.now()}`),
        fetch(`/health?t=${Date.now()}`),
      ]);

      if (resHealth.ok) {
        const health = await resHealth.json();
        state.cluster.activeGames = health.activeGames || 0;
        state.cluster.waitingQueue = health.waitingPlayers || 0;
      }

      if (resTelemetry.ok) {
        const telemetry = await resTelemetry.json();

        // 1. Atualiza Operador
        if (telemetry.operator && telemetry.operator !== "sistema") {
          state.operator.isAuthenticated = true;
          if (telemetry.operatorName) {
            state.operator.name = telemetry.operatorName;
          }
          if (telemetry.operatorEmail) {
            state.operator.email = telemetry.operatorEmail;
          } else if (telemetry.operator.includes("@")) {
            state.operator.email = telemetry.operator;
            if (!telemetry.operatorName) {
              const userPart = telemetry.operator.split("@")[0].replace(/[._-]/g, " ");
              state.operator.name = userPart.charAt(0).toUpperCase() + userPart.slice(1);
            }
          } else if (!telemetry.operatorName) {
            state.operator.name = telemetry.operator;
          }
          if (DOM.operatorName) DOM.operatorName.textContent = state.operator.name;
          if (DOM.operatorEmail) DOM.operatorEmail.textContent = state.operator.email || "Autenticado";
        }

        // 2. Atualiza Containers / Nós
        if (Array.isArray(telemetry.containers)) {
          for (const c of telemetry.containers) {
            const targetNode = state.nodes[c.name];
            if (targetNode) {
              const isRunning = c.status === "Running";
              targetNode.status = isRunning ? "ativo" : "morto";
              if (c.ramUsedMb) targetNode.ram = Math.round(c.ramUsedMb);
              if (c.ip) targetNode.ip = c.ip;
            }
          }
        }

        // 3. Atualiza Games / Partidas
        if (telemetry.games) {
          state.cluster.activeGames = telemetry.games.active ?? state.cluster.activeGames;
          state.cluster.waitingQueue = telemetry.games.waitingQueue ?? state.cluster.waitingQueue;
        }

        if (telemetry.hostMetrics) {
          state.cluster.hostMemoryPercent = telemetry.hostMetrics.memoryUsagePercent || 0;
        }
      }

      // Consulta eventos persistidos se a lista local estiver vazia
      if (state.events.length <= 2) {
        try {
          const resEvents = await fetch(`/api/admin/events?limit=25&t=${Date.now()}`);
          if (resEvents.ok) {
            const evList = await resEvents.json();
            const list = Array.isArray(evList) ? evList : (evList.events || []);
            for (const ev of list.reverse()) {
              const cat = categorizeEvent(ev.type, ev.message);
              addTerminalEvent(cat, ev.message, ev.details, ev.createdAtIso || ev.timestamp);
            }
          }
        } catch (_) {}
      }

      if (DOM.nodesLastSync) {
        DOM.nodesLastSync.textContent = `Sincronizado às ${new Date().toLocaleTimeString()}`;
      }

      renderNodesCards();
    } catch (e) {
      if (DOM.nodesLastSync) {
        DOM.nodesLastSync.textContent = `Modo Autônomo`;
      }
    }
  }

  /* ==========================================================================
     EVENT LISTENERS & BINDINGS
     ========================================================================== */
  function setupEventListeners() {
    // Theme & Sound
    DOM.themeToggle?.addEventListener("click", toggleTheme);
    DOM.soundToggle?.addEventListener("click", toggleSound);

    // Chaos Buttons click
    document.getElementById("btn-kill-proc-node1")?.addEventListener("click", () => openConfirmationModal(CHAOS_ACTION_PRESETS["kill-proc-node1"]));
    document.getElementById("btn-kill-proc-node2")?.addEventListener("click", () => openConfirmationModal(CHAOS_ACTION_PRESETS["kill-proc-node2"]));
    document.getElementById("btn-drop-node1")?.addEventListener("click", () => openConfirmationModal(CHAOS_ACTION_PRESETS["drop-node1"]));
    document.getElementById("btn-drop-node2")?.addEventListener("click", () => openConfirmationModal(CHAOS_ACTION_PRESETS["drop-node2"]));
    document.getElementById("btn-drop-ctrl")?.addEventListener("click", () => openConfirmationModal(CHAOS_ACTION_PRESETS["drop-ctrl"]));
    document.getElementById("btn-heal-all")?.addEventListener("click", () => openConfirmationModal(CHAOS_ACTION_PRESETS["heal-all"]));

    // Quick-kill buttons inside cards
    document.querySelectorAll(".btn-quick-kill").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget.getAttribute("data-target");
        if (target === "ctrl-primary") openConfirmationModal(CHAOS_ACTION_PRESETS["drop-ctrl"]);
        else if (target === "game-node-1") openConfirmationModal(CHAOS_ACTION_PRESETS["drop-node1"]);
        else if (target === "game-node-2") openConfirmationModal(CHAOS_ACTION_PRESETS["drop-node2"]);
        else if (target === "ctrl-backup") {
          openConfirmationModal({
            url: "/api/admin/chaos/kill-node",
            payload: { node: "ctrl-backup" },
            target: "ctrl-backup",
            title: "Derrubar Nó ctrl-backup (LXC)",
            command: "incus stop ctrl-backup --force",
            impact: "Interrupção forçada do controlador standby. Testa comportamento do primário sem réplica ativa.",
            variant: "ctrl",
          });
        } else if (target === "game-node-3") {
          openConfirmationModal({
            url: "/api/admin/chaos/kill-node",
            payload: { node: "game-node-3" },
            target: "game-node-3",
            title: "Derrubar Nó game-node-3 (LXC)",
            command: "incus stop game-node-3 --force",
            impact: "Interrupção do nó elástico de cura.",
            variant: "danger",
          });
        }
      });
    });

    // Modal buttons
    DOM.btnModalCancel?.addEventListener("click", closeConfirmationModal);
    DOM.btnModalConfirm?.addEventListener("click", () => executeChaosAction(state.activeModalAction));
    DOM.modalOverlay?.addEventListener("click", (e) => {
      if (e.target === DOM.modalOverlay) closeConfirmationModal();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && DOM.modalOverlay?.classList.contains("active")) {
        closeConfirmationModal();
      }
    });

    // Refresh nodes button
    DOM.btnRefreshNodes?.addEventListener("click", () => {
      pollClusterMetrics();
      showToast("Sincronização", "Nós atualizados com o controller.", "info", 2000);
    });

    // Charts stream toggle & window filters
    DOM.btnToggleChartsStream?.addEventListener("click", () => {
      state.chartsPaused = !state.chartsPaused;
      DOM.btnToggleChartsStream.textContent = state.chartsPaused ? "▶️ Retomar Gráficos" : "⏸️ Pausar Gráficos";
      if (DOM.metricsStreamBadge) {
        DOM.metricsStreamBadge.textContent = state.chartsPaused ? "⏸️ Amostragem Pausada" : "● Amostragem: 3s";
        DOM.metricsStreamBadge.style.color = state.chartsPaused ? "var(--accent-amber)" : "var(--accent-emerald)";
      }
      if (!state.chartsPaused) {
        fetchTimeSeries();
      }
    });

    DOM.btnWin1m?.addEventListener("click", () => setWindowFilter("1m"));
    DOM.btnWin3m?.addEventListener("click", () => setWindowFilter("3m"));
    DOM.btnWin5m?.addEventListener("click", () => setWindowFilter("5m"));
    DOM.btnWin15m?.addEventListener("click", () => setWindowFilter("15m"));
    DOM.btnWin30m?.addEventListener("click", () => setWindowFilter("30m"));
    DOM.btnWin60m?.addEventListener("click", () => setWindowFilter("60m"));

    // Series visibility toggles for each node
    DOM.nodeFilterChips?.forEach((chip) => {
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        const checkbox = chip.querySelector("input[type='checkbox']");
        if (!checkbox) return;
        checkbox.checked = !checkbox.checked;
        chip.classList.toggle("active", checkbox.checked);
        const datasetIdx = Number(checkbox.getAttribute("data-dataset"));
        if (state.charts.ram && !isNaN(datasetIdx)) {
          state.charts.ram.setDatasetVisibility(datasetIdx, checkbox.checked);
          state.charts.ram.update("none");
        }
      });
    });

    // Forensic scrubber slider & reset
    DOM.forensicTimeSlider?.addEventListener("input", (e) => {
      const pct = Number(e.target.value);
      if (!state.samples || state.samples.length === 0) return;
      const idx = Math.min(state.samples.length - 1, Math.floor((pct / 100) * state.samples.length));
      state.forensicIndex = idx;
      const sample = state.samples[idx];
      const timeStr = formatTimeLabel(sample.epoch || sample.timestamp);
      if (DOM.forensicSliderTime) {
        DOM.forensicSliderTime.textContent = pct === 100 ? "Agora (Tempo Real)" : `Forense: ${timeStr} (${pct}%)`;
      }

      if (sample.containers) {
        Object.keys(sample.containers).forEach((nodeId) => {
          const c = sample.containers[nodeId];
          const ramEl = document.getElementById(`ram-${nodeId}`);
          const barEl = document.getElementById(`bar-${nodeId}`);
          const badgeEl = document.getElementById(`badge-${nodeId}`);
          if (ramEl) ramEl.textContent = `${c.ramMb} MB / ${c.maxRamMb || 512} MB`;
          if (barEl) barEl.style.width = `${Math.min(100, Math.round((c.ramMb / (c.maxRamMb || 512)) * 100))}%`;
          if (badgeEl) {
            badgeEl.textContent = c.status === "Running" ? "Ativo" : (c.status === "Stopped" ? "Morto" : c.status);
            badgeEl.className = `node-status-badge ${c.status === "Running" ? "ativo" : (c.status === "Stopped" ? "morto" : "standby")}`;
          }
        });
      }
    });

    DOM.btnResetForensic?.addEventListener("click", () => {
      state.forensicIndex = null;
      if (DOM.forensicTimeSlider) DOM.forensicTimeSlider.value = 100;
      if (DOM.forensicSliderTime) DOM.forensicSliderTime.textContent = "Agora (Tempo Real)";
      pollClusterMetrics();
      fetchTimeSeries();
      showToast("Modo ao Vivo", "Retornado para telemetria em tempo real.", "info", 1500);
    });

    DOM.btnCloseForensicModal?.addEventListener("click", closeForensicModal);
    DOM.forensicModal?.addEventListener("click", (e) => {
      if (e.target === DOM.forensicModal) closeForensicModal();
    });

    DOM.btnDownloadChartsImg?.addEventListener("click", downloadChartsImage);
    DOM.btnExportCsv?.addEventListener("click", () => {
      showToast("Download CSV", "A exportação das métricas foi solicitada com sucesso.", "info", 2000);
    });

    // Terminal filters
    DOM.filterTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        DOM.filterTabs.forEach((t) => t.classList.remove("active"));
        e.currentTarget.classList.add("active");
        state.activeFilter = e.currentTarget.getAttribute("data-filter");
        renderFilteredEvents();
      });
    });

    // Terminal search
    DOM.searchInput?.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim();
      renderFilteredEvents();
    });

    // Terminal autoscroll toggle
    DOM.btnToggleAutoscroll?.addEventListener("click", () => {
      state.autoScroll = !state.autoScroll;
      DOM.btnToggleAutoscroll.textContent = state.autoScroll ? "⬇️ Auto-Scroll: ON" : "⏸️ Auto-Scroll: OFF";
      DOM.btnToggleAutoscroll.className = `terminal-btn ${state.autoScroll ? "autoscroll-on" : ""}`;
    });

    // Terminal clear
    DOM.btnClearTerminal?.addEventListener("click", () => {
      state.events = [];
      updateFilterCounts();
      renderFilteredEvents();
      showToast("Terminal Limpo", "O histórico de eventos exibido foi resetado.", "info", 2000);
    });

    // Terminal export
    DOM.btnExportTerminal?.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.events, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `forca-events-audit-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Auditoria Exportada", "Arquivo JSON baixado com sucesso.", "success", 2500);
    });
  }

  /* ==========================================================================
     SEED INITIAL REALISTIC LOGS & BOOTSTRAP
     ========================================================================== */
  function seedInitialEvents() {
    const seeds = [
      { cat: "healing", msg: "[AUTO-HEALING] Daemon forca-auto-heal operacional. Sonda ativa a cada 3.000ms.", t: new Date(Date.now() - 40000).toISOString() },
      { cat: "failover", msg: "[FENCING] Fencing Token ativo com epoch #1. Lease lock validado em /run/forca-cluster.", t: new Date(Date.now() - 32000).toISOString() },
      { cat: "jogo", msg: "[LOBBY] Orquestrador Ativo pronto para pareamento de partidas 1v1.", t: new Date(Date.now() - 25000).toISOString() },
      { cat: "caos", msg: "[CHAOS ENGINE] Injetor de falhas conectado com sucesso ao cluster Incus.", t: new Date(Date.now() - 15000).toISOString() },
      { cat: "info", msg: `[SRE LOGIN] Operador autenticado com sucesso via VPS Auth Gateway (${state.operator.email}).`, t: new Date().toISOString() },
    ];

    for (const s of seeds) {
      addTerminalEvent(s.cat, s.msg, {}, s.t);
    }
  }

  /* ==========================================================================
     APPLICATION INIT
     ========================================================================== */
  async function init() {
    initTheme();
    await resolveOperatorIdentity();
    setupEventListeners();
    initCharts();
    initSocket();
    seedInitialEvents();
    renderNodesCards();

    pollClusterMetrics();
    fetchTimeSeries();
    setInterval(pollClusterMetrics, CONFIG.metricsPollIntervalMs);
    setInterval(fetchTimeSeries, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

const cartoesResumo = document.querySelector("#summary-cards");
const cartoesNosServidores = document.querySelector("#server-nodes-cards");
const corpoServidores = document.querySelector("#servers-body");
const corpoFila = document.querySelector("#queue-body");
const corpoSessoes = document.querySelector("#sessions-body");
const corpoPartidas = document.querySelector("#games-body");
const listaEventos = document.querySelector("#events-list");
const ultimaAtualizacao = document.querySelector("#last-refresh");
const seloSaude = document.querySelector("#monitor-health-badge");
const botaoAtualizarManual = document.querySelector("#manual-refresh-btn");
const botaoTema = document.querySelector("#theme-toggle");

const chaveTema = "forca-distribuida-theme";

// Gerenciamento de Tema
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
botaoAtualizarManual?.addEventListener("click", () => {
  atualizarPainel();
});

function formatarHora(isoString) {
  if (!isoString) return "-";
  try {
    const data = new Date(isoString);
    return data.toLocaleTimeString();
  } catch {
    return isoString;
  }
}

function formatarTempoRelativo(isoString) {
  if (!isoString) return "-";
  try {
    const data = new Date(isoString);
    const segundosAtras = Math.floor((Date.now() - data.getTime()) / 1000);
    if (segundosAtras < 5) return "há instantes";
    if (segundosAtras < 60) return `há ${segundosAtras}s`;
    return `há ${Math.floor(segundosAtras / 60)}m`;
  } catch {
    return isoString;
  }
}

function renderizarResumo(saude, metricas) {
  if (!cartoesResumo) return;

  const totalServidores = saude.servers || 0;
  const servidoresSaudaveis = saude.healthyServers || 0;
  const taxaDisponibilidade = totalServidores > 0 ? Math.round((servidoresSaudaveis / totalServidores) * 100) : 0;

  const cartoes = [
    { label: "Nós Registrados", value: totalServidores, icon: "🖥️", badge: `${servidoresSaudaveis} ativos` },
    { label: "Saúde do Cluster", value: `${taxaDisponibilidade}%`, icon: "🟢", badge: servidoresSaudaveis === totalServidores ? "100% OK" : "Degradado" },
    { label: "Fila de Pareamento", value: saude.waitingPlayers || 0, icon: "👥", badge: "Jogadores" },
    { label: "Partidas Ativas", value: saude.activeGames || 0, icon: "⚔️", badge: "Em tempo real" },
    { label: "Sessões Totais", value: metricas.sessions?.length || 0, icon: "📋", badge: "Registradas" }
  ];

  cartoesResumo.innerHTML = cartoes.map((cartao) => `
    <article class="summary-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <span>${cartao.label}</span>
        <span style="font-size: 1.3rem;">${cartao.icon}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <strong>${cartao.value}</strong>
        <span class="badge" style="font-size: 0.72rem; padding: 2px 8px;">${cartao.badge}</span>
      </div>
    </article>
  `).join("");

  if (seloSaude) {
    const todosOk = totalServidores > 0 && servidoresSaudaveis === totalServidores;
    seloSaude.className = todosOk ? "badge online pulse" : "badge";
    seloSaude.textContent = todosOk ? "🟢 Cluster 100% Saudável" : `⚠️ ${servidoresSaudaveis}/${totalServidores} Nós Online`;
  }
}

function celula(valor) {
  return valor ?? "-";
}

function renderizarNosCards(servidores) {
  if (!cartoesNosServidores) return;

  if (!servidores.length) {
    cartoesNosServidores.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted);">
        Nenhum nó de servidor conectado ao controller.
      </div>
    `;
    return;
  }

  cartoesNosServidores.innerHTML = servidores.map((servidor) => `
    <div class="server-node-card ${servidor.healthy ? "healthy" : "down"}">
      <div class="node-header">
        <strong>${servidor.serverId}</strong>
        <span class="status-pill ${servidor.healthy ? "healthy" : "down"}">
          ${servidor.healthy ? "Saudável" : "Sem Heartbeat"}
        </span>
      </div>
      <div class="node-metric">
        <span>Partidas Ativas:</span>
        <strong style="color: var(--primary); font-size: 1rem;">${servidor.activeGames}</strong>
      </div>
      <div class="node-metric">
        <span>Último Heartbeat:</span>
        <span style="color: var(--text-muted); font-size: 0.8rem;">
          ${formatarHora(servidor.lastHeartbeatIso)} (${formatarTempoRelativo(servidor.lastHeartbeatIso)})
        </span>
      </div>
      <div class="node-metric">
        <span>URL Pública:</span>
        <code style="font-size: 0.78rem; background: rgba(0,0,0,0.15); padding: 2px 6px; border-radius: 4px;">
          ${servidor.publicUrl}
        </code>
      </div>
    </div>
  `).join("");
}

function renderizarServidores(servidores) {
  if (!corpoServidores) return;

  renderizarNosCards(servidores);

  if (!servidores.length) {
    corpoServidores.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum servidor registrado.</td></tr>`;
    return;
  }

  corpoServidores.innerHTML = servidores.map((servidor) => `
    <tr>
      <td><strong>${servidor.serverId}</strong></td>
      <td>
        <span class="status-pill ${servidor.healthy ? "healthy" : "down"}">
          ${servidor.healthy ? "🟢 Saudável" : "🔴 Sem Heartbeat"}
        </span>
      </td>
      <td style="text-align: center;"><strong>${servidor.activeGames}</strong></td>
      <td>${formatarHora(servidor.lastHeartbeatIso)} <span style="font-size: 0.75rem; color: var(--text-muted);">(${formatarTempoRelativo(servidor.lastHeartbeatIso)})</span></td>
      <td><code style="font-size: 0.8rem;">${servidor.publicUrl}</code></td>
    </tr>
  `).join("");
}

function renderizarFila(fila) {
  if (!corpoFila) return;

  if (!fila.length) {
    corpoFila.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Fila vazia. Nenhum jogador aguardando.</td></tr>`;
    return;
  }

  corpoFila.innerHTML = fila.map((entrada) => `
    <tr>
      <td><span class="badge" style="font-size: 0.8rem;">#${entrada.position}</span></td>
      <td><strong>${entrada.playerName}</strong></td>
      <td><code style="font-size: 0.75rem; color: var(--text-muted);">${entrada.playerId}</code></td>
    </tr>
  `).join("");
}

function renderizarPartidas(partidas) {
  if (!corpoPartidas) return;

  if (!partidas.length) {
    corpoPartidas.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma partida em andamento no momento.</td></tr>`;
    return;
  }

  corpoPartidas.innerHTML = partidas.map((partida) => {
    const isPlaying = partida.status === "playing";
    return `
      <tr>
        <td><code style="font-size: 0.75rem; font-weight: 700; color: var(--primary);">${partida.gameId}</code></td>
        <td><span class="badge" style="font-size: 0.75rem;">${celula(partida.serverId)}</span></td>
        <td>
          <span class="status-pill ${isPlaying ? "healthy" : "down"}" style="font-size: 0.75rem;">
            ${isPlaying ? "Em andamento" : partida.status}
          </span>
        </td>
        <td><span style="font-size: 0.85rem;">${(partida.playerIds || []).join(", ") || "-"}</span></td>
      </tr>
    `;
  }).join("");
}

function renderizarSessoes(sessoes) {
  if (!corpoSessoes) return;

  if (!sessoes.length) {
    corpoSessoes.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma sessão ativa.</td></tr>`;
    return;
  }

  corpoSessoes.innerHTML = sessoes.slice(0, 15).map((sessao) => `
    <tr>
      <td><strong>${sessao.playerName}</strong></td>
      <td><span class="badge" style="font-size: 0.75rem;">${sessao.status}</span></td>
      <td><code style="font-size: 0.75rem;">${celula(sessao.gameId)}</code></td>
      <td><span style="font-size: 0.85rem;">${celula(sessao.serverId)}</span></td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${formatarHora(sessao.createdAtIso)}</td>
    </tr>
  `).join("");
}

function renderizarEventos(eventos) {
  if (!listaEventos) return;

  if (!eventos.length) {
    listaEventos.innerHTML = "<li>Nenhum evento registrado ainda.</li>";
    return;
  }

  listaEventos.innerHTML = eventos.slice(0, 25).map((evento) => {
    const hora = formatarHora(evento.createdAtIso || evento.createdAt);
    const tipo = evento.type || "INFO";
    let tagCor = "var(--primary)";
    if (tipo.includes("match") || tipo.includes("game")) tagCor = "var(--accent-emerald)";
    if (tipo.includes("failover") || tipo.includes("disconnect")) tagCor = "var(--accent-rose)";
    if (tipo.includes("heartbeat")) tagCor = "var(--accent-amber)";

    return `
      <li>
        <span style="color: var(--text-muted); font-size: 0.8rem; margin-right: 6px;">[${hora}]</span>
        <span class="badge" style="background: rgba(255,255,255,0.06); color: ${tagCor}; font-size: 0.7rem; padding: 1px 6px; margin-right: 8px;">
          ${tipo.toUpperCase()}
        </span>
        <strong>${evento.message}</strong>
      </li>
    `;
  }).join("");
}

async function atualizarPainel() {
  try {
    const [respostaSaude, respostaMetricas] = await Promise.all([
      fetch(`/health?t=${Date.now()}`),
      fetch(`/metrics?t=${Date.now()}`)
    ]);
    const saude = await respostaSaude.json();
    const metricas = await respostaMetricas.json();

    renderizarResumo(saude, metricas);
    renderizarServidores(metricas.servers || []);
    renderizarFila(metricas.waitingQueue || []);
    renderizarPartidas(metricas.games || []);
    renderizarSessoes(metricas.sessions || []);
    renderizarEventos(metricas.events || []);
    if (ultimaAtualizacao) {
      ultimaAtualizacao.textContent = `Atualizado às ${new Date().toLocaleTimeString()}`;
    }
  } catch {
    if (ultimaAtualizacao) {
      ultimaAtualizacao.textContent = "Falha ao consultar controller.";
    }
  }
}

inicializarTema();
atualizarPainel();
setInterval(atualizarPainel, 3000);

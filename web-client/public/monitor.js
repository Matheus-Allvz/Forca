const cartoesResumo = document.querySelector("#summary-cards");
const corpoServidores = document.querySelector("#servers-body");
const corpoFila = document.querySelector("#queue-body");
const corpoSessoes = document.querySelector("#sessions-body");
const corpoPartidas = document.querySelector("#games-body");
const ultimaAtualizacao = document.querySelector("#last-refresh");

function renderizarResumo(saude, metricas) {
  const cartoes = [
    { label: "Servidores registrados", value: saude.servers },
    { label: "Servidores saudaveis", value: saude.healthyServers },
    { label: "Jogadores na fila", value: saude.waitingPlayers },
    { label: "Partidas ativas", value: saude.activeGames },
    { label: "Sessoes totais", value: metricas.sessions.length }
  ];

  cartoesResumo.innerHTML = cartoes.map((cartao) => `
    <article class="panel summary-card">
      <span>${cartao.label}</span>
      <strong>${cartao.value}</strong>
    </article>
  `).join("");
}

function celula(valor) {
  return valor ?? "-";
}

function renderizarServidores(servidores) {
  if (!servidores.length) {
    corpoServidores.innerHTML = `<tr><td colspan="5">Nenhum servidor registrado.</td></tr>`;
    return;
  }

  corpoServidores.innerHTML = servidores.map((servidor) => `
    <tr>
      <td>${servidor.serverId}</td>
      <td><span class="status-pill ${servidor.healthy ? "healthy" : "down"}">${servidor.healthy ? "Saudavel" : "Sem heartbeat"}</span></td>
      <td>${servidor.activeGames}</td>
      <td>${servidor.lastHeartbeatIso}</td>
      <td>${servidor.publicUrl}</td>
    </tr>
  `).join("");
}

function renderizarFila(fila) {
  if (!fila.length) {
    corpoFila.innerHTML = `<tr><td colspan="3">Fila vazia.</td></tr>`;
    return;
  }

  corpoFila.innerHTML = fila.map((entrada) => `
    <tr>
      <td>${entrada.position}</td>
      <td>${entrada.playerName}</td>
      <td>${entrada.playerId}</td>
    </tr>
  `).join("");
}

function renderizarPartidas(partidas) {
  if (!partidas.length) {
    corpoPartidas.innerHTML = `<tr><td colspan="4">Nenhuma partida criada.</td></tr>`;
    return;
  }

  corpoPartidas.innerHTML = partidas.map((partida) => `
    <tr>
      <td>${partida.gameId}</td>
      <td>${celula(partida.serverId)}</td>
      <td>${partida.status}</td>
      <td>${(partida.playerIds || []).join(", ")}</td>
    </tr>
  `).join("");
}

function renderizarSessoes(sessoes) {
  if (!sessoes.length) {
    corpoSessoes.innerHTML = `<tr><td colspan="5">Nenhuma sessao criada.</td></tr>`;
    return;
  }

  corpoSessoes.innerHTML = sessoes.map((sessao) => `
    <tr>
      <td>${sessao.playerName}</td>
      <td>${sessao.status}</td>
      <td>${celula(sessao.gameId)}</td>
      <td>${celula(sessao.serverId)}</td>
      <td>${sessao.createdAtIso}</td>
    </tr>
  `).join("");
}

async function atualizarPainel() {
  try {
    const [respostaSaude, respostaMetricas] = await Promise.all([
      fetch("/health"),
      fetch("/metrics")
    ]);
    const saude = await respostaSaude.json();
    const metricas = await respostaMetricas.json();

    renderizarResumo(saude, metricas);
    renderizarServidores(metricas.servers || []);
    renderizarFila(metricas.waitingQueue || []);
    renderizarPartidas(metricas.games || []);
    renderizarSessoes(metricas.sessions || []);
    ultimaAtualizacao.textContent = `Ultima atualizacao: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    ultimaAtualizacao.textContent = "Falha ao atualizar o painel.";
  }
}

atualizarPainel();
setInterval(atualizarPainel, 3000);

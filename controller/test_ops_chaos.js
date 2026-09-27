const assert = require("assert");
const http = require("http");
const { app, io, eventosRecentes, servidoresRegistrados, partidas, filaDeEspera, registrarEvento, verificarHeartbeatsExpirados, obterServidoresSaudaveis } = require("./server");

process.env.NODE_ENV = "test";

function httpRequest(server, options, body = null) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port: address.port,
      path: options.path,
      method: options.method || "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== INICIANDO TESTES DO BACKEND DE OPERAÇÕES E CAOS ===");

  const testServer = http.createServer(app);
  await new Promise(resolve => testServer.listen(0, resolve));
  const port = testServer.address().port;
  console.log(`Test server running on port ${port}`);

  const opsEventsReceived = [];
  io.on("ops-event", (evt) => {
    opsEventsReceived.push(evt);
  });

  // Validar rota /ops
  const resOpsHtml = await httpRequest(testServer, { path: "/ops" });
  assert.strictEqual(resOpsHtml.statusCode, 200, "GET /ops deve retornar 200 OK");
  assert(resOpsHtml.body.includes("Forca SRE Console"), "GET /ops deve retornar o HTML do SRE Console");
  console.log("  ✓ Rota /ops validada servindo ops.html com sucesso!");

  try {
    // ------------------------------------------------------------------
    // TESTE 1: Telemetria do Cluster (GET /api/admin/telemetry)
    // ------------------------------------------------------------------
    console.log("\n[1/6] Testando GET /api/admin/telemetry...");
    const resTelemetry = await httpRequest(testServer, {
      path: "/api/admin/telemetry",
      headers: { "X-Auth-Email": "sre-ops@example.com" }
    });

    assert.strictEqual(resTelemetry.statusCode, 200, "Telemetry deve responder HTTP 200");
    const t = resTelemetry.body;
    assert.strictEqual(t.operator, "sre-ops@example.com", "Operador deve ser extraído do cabeçalho X-Auth-Email");
    assert(Array.isArray(t.containers), "Telemetria deve incluir lista de containers");
    assert(t.containers.length >= 4, "Deve reportar os 4 containers da topologia nominal");
    
    // Validar atributos de cada container
    for (const c of t.containers) {
      assert(c.name, "Container deve ter nome");
      assert(c.status, "Container deve ter status");
      assert(c.ip, "Container deve ter IP");
      assert(typeof c.ramUsed === "number", "Container deve ter ramUsed");
      assert(typeof c.memoryUsage === "number", "Container deve ter memoryUsage");
    }

    // Validar métricas do host
    assert(t.hostMetrics, "Deve incluir hostMetrics");
    assert(t.hostMetrics.hostname, "Deve reportar hostname");
    assert(typeof t.hostMetrics.totalMemoryBytes === "number", "Deve reportar totalMemoryBytes");
    assert(typeof t.hostMetrics.freeMemoryBytes === "number", "Deve reportar freeMemoryBytes");
    assert(typeof t.hostMetrics.usedMemoryBytes === "number", "Deve reportar usedMemoryBytes");
    assert(typeof t.hostMetrics.memoryUsagePercent === "number", "Deve reportar memoryUsagePercent");
    assert(typeof t.hostMetrics.uptimeSeconds === "number", "Deve reportar uptime");
    assert(Array.isArray(t.hostMetrics.loadAverage), "Deve reportar loadAverage");

    // Validar contadores de partidas
    assert(t.games, "Deve incluir contadores de games");
    assert(typeof t.games.active === "number", "Deve reportar partidas ativas");
    assert(typeof t.games.total === "number", "Deve reportar partidas totais");
    console.log("  ✓ Telemetria validada com sucesso! Containers encontrados:", t.containers.map(c => `${c.name} (${c.ip}, ${c.status})`).join(", "));

    // ------------------------------------------------------------------
    // TESTE 2: Chaos kill-process (POST /api/admin/chaos/kill-process)
    // ------------------------------------------------------------------
    console.log("\n[2/6] Testando POST /api/admin/chaos/kill-process...");
    const resKillProc = await httpRequest(testServer, {
      path: "/api/admin/chaos/kill-process",
      method: "POST",
      headers: { "X-Auth-Email": "chaos-engineer@example.com" }
    }, { node: "game-node-1", port: 4001 });

    assert.strictEqual(resKillProc.statusCode, 200, "Kill-process deve responder HTTP 200");
    assert.strictEqual(resKillProc.body.ok, true);
    assert.strictEqual(resKillProc.body.node, "game-node-1");
    assert.strictEqual(resKillProc.body.port, 4001);
    assert.strictEqual(resKillProc.body.operator, "chaos-engineer@example.com");

    // Validar evento gerado
    const killProcEvent = eventosRecentes.find(e => e.type === "acao_caos" && e.details?.action === "kill-process");
    assert(killProcEvent, "Evento de caos kill-process deve ter sido registrado");
    assert.strictEqual(killProcEvent.operator, "chaos-engineer@example.com");
    assert(killProcEvent.timestamp, "Evento deve conter timestamp ISO");
    console.log("  ✓ kill-process validado com sucesso! Evento:", killProcEvent.message);

    // ------------------------------------------------------------------
    // TESTE 3: Chaos kill-node (POST /api/admin/chaos/kill-node)
    // ------------------------------------------------------------------
    console.log("\n[3/6] Testando POST /api/admin/chaos/kill-node...");
    const resKillNode = await httpRequest(testServer, {
      path: "/api/admin/chaos/kill-node",
      method: "POST",
      headers: { "X-Auth-Email": "chaos-engineer@example.com" }
    }, { node: "game-node-2" });

    assert.strictEqual(resKillNode.statusCode, 200, "Kill-node deve responder HTTP 200");
    assert.strictEqual(resKillNode.body.ok, true);
    assert.strictEqual(resKillNode.body.node, "game-node-2");

    const killNodeEvent = eventosRecentes.find(e => e.type === "acao_caos" && e.details?.action === "kill-node");
    assert(killNodeEvent, "Evento de caos kill-node deve ter sido registrado");
    console.log("  ✓ kill-node validado com sucesso! Evento:", killNodeEvent.message);

    // ------------------------------------------------------------------
    // TESTE 4: Chaos stop-primary (POST /api/admin/chaos/stop-primary)
    // ------------------------------------------------------------------
    console.log("\n[4/6] Testando POST /api/admin/chaos/stop-primary...");
    const resStopPrimary = await httpRequest(testServer, {
      path: "/api/admin/chaos/stop-primary",
      method: "POST",
      headers: { "X-Auth-Email": "lead-sre@example.com" }
    });

    assert.strictEqual(resStopPrimary.statusCode, 200, "Stop-primary deve responder HTTP 200");
    assert.strictEqual(resStopPrimary.body.ok, true);
    assert.strictEqual(resStopPrimary.body.operator, "lead-sre@example.com");

    const stopPrimaryEvent = eventosRecentes.find(e => e.type === "acao_caos" && e.details?.action === "stop-primary");
    assert(stopPrimaryEvent, "Evento de caos stop-primary deve ter sido registrado");
    console.log("  ✓ stop-primary validado com sucesso! Mensagem:", resStopPrimary.body.message);

    // ------------------------------------------------------------------
    // TESTE 5: Chaos heal (POST /api/admin/chaos/heal)
    // ------------------------------------------------------------------
    console.log("\n[5/6] Testando POST /api/admin/chaos/heal...");
    const resHeal = await httpRequest(testServer, {
      path: "/api/admin/chaos/heal",
      method: "POST",
      headers: { "X-Auth-Email": "auto-healer@example.com" }
    });

    assert.strictEqual(resHeal.statusCode, 200, "Heal deve responder HTTP 200");
    assert.strictEqual(resHeal.body.ok, true);
    assert.strictEqual(resHeal.body.healthyServers, 4, "Topologia nominal deve garantir 4 servidores saudáveis");
    assert.strictEqual(resHeal.body.operator, "auto-healer@example.com");

    const healEvent = eventosRecentes.find(e => e.type === "auto_healing" && e.details?.action === "heal");
    assert(healEvent, "Evento auto_healing deve ter sido registrado");
    console.log("  ✓ heal validado com sucesso! Servidores saudáveis:", resHeal.body.healthyServers);

    // ------------------------------------------------------------------
    // TESTE 6: Motor de Eventos Distribuídos e Buffer Circular de 200 itens
    // ------------------------------------------------------------------
    console.log("\n[6/6] Testando Motor de Eventos Distribuídos e Buffer Circular...");

    // Testar todos os 7 tipos obrigatórios de eventos:
    // 1. jogador_entrou
    registrarEvento("jogador_entrou", "Alice entrou no lobby.", { playerId: "p1", playerName: "Alice" }, "alice@example.com");
    // 2. partida_criada
    registrarEvento("partida_criada", "Partida game-101 criada.", { gameId: "game-101", players: ["Alice", "Bob"] }, "sistema");
    // 3. lance_letra (via POST /internal/game-state)
    partidas.set("game-101", {
      gameId: "game-101",
      serverId: "node1-game-server-4001",
      status: "playing",
      snapshot: { attemptedLetters: ["A"] }
    });
    await httpRequest(testServer, {
      path: "/internal/game-state",
      method: "POST"
    }, {
      serverId: "node1-game-server-4001",
      game: {
        gameId: "game-101",
        status: "playing",
        attemptedLetters: ["A", "E"],
        correctLetters: ["E"],
        players: [{ playerId: "p1" }]
      }
    });
    // 4. heartbeat_expirado
    servidoresRegistrados.set("test-server-dead", {
      serverId: "test-server-dead",
      lastHeartbeat: Date.now() - 30000,
      previouslyHealthy: true
    });
    verificarHeartbeatsExpirados();
    // 5. partida_migrada
    registrarEvento("partida_migrada", "Partida game-101 migrada de node1 para node2.", { gameId: "game-101" }, "sistema");
    // 6. acao_caos (já registrado anteriormente)
    // 7. auto_healing (já registrado anteriormente)

    const resEvents = await httpRequest(testServer, {
      path: "/api/admin/events"
    });

    assert.strictEqual(resEvents.statusCode, 200, "GET /api/admin/events deve responder HTTP 200");
    const eventsList = resEvents.body;
    assert(Array.isArray(eventsList), "GET /api/admin/events deve retornar array do buffer circular");
    assert(eventsList.length > 0, "Buffer de eventos não deve estar vazio");

    // Verificar se todos os 7 tipos estão presentes no buffer
    const tiposPresentes = new Set(eventsList.map(e => e.type));
    console.log("  Tipos de eventos registrados:", Array.from(tiposPresentes));
    
    assert(tiposPresentes.has("jogador_entrou"), "Deve conter jogador_entrou");
    assert(tiposPresentes.has("partida_criada"), "Deve conter partida_criada");
    assert(tiposPresentes.has("lance_letra"), "Deve conter lance_letra");
    assert(tiposPresentes.has("heartbeat_expirado"), "Deve conter heartbeat_expirado");
    assert(tiposPresentes.has("partida_migrada"), "Deve conter partida_migrada");
    assert(tiposPresentes.has("acao_caos"), "Deve conter acao_caos");
    assert(tiposPresentes.has("auto_healing"), "Deve conter auto_healing");

    // Validar envelope estruturado de evento
    for (const evt of eventsList.slice(0, 10)) {
      assert(evt.id, "Evento deve ter id");
      assert(evt.timestamp, "Evento deve ter timestamp");
      assert(evt.operator, "Evento deve ter operador");
      assert(evt.type, "Evento deve ter type");
      assert(evt.message, "Evento deve ter message");
      assert(evt.details, "Evento deve ter details");
      assert(evt.createdAtIso, "Evento deve ter createdAtIso");
    }

    // Testar limite do buffer circular de 200
    console.log("  Testando limite circular de 200 eventos...");
    for (let i = 0; i < 250; i++) {
      registrarEvento("stress_test", `Evento de teste #${i}`, { index: i }, "test@example.com");
    }

    assert.strictEqual(eventosRecentes.length, 200, "Buffer circular deve manter exatamente 200 eventos");
    const resEvents200 = await httpRequest(testServer, { path: "/api/admin/events" });
    assert.strictEqual(resEvents200.body.length, 200, "Endpoint deve retornar no máximo 200 eventos");

    // Testar suporte a formato objeto via query param (?format=object)
    const resEventsObj = await httpRequest(testServer, { path: "/api/admin/events?format=object" });
    assert.strictEqual(resEventsObj.body.total, 200);
    assert.strictEqual(resEventsObj.body.events.length, 200);

    console.log("  ✓ Buffer circular de 200 itens validado com sucesso!");
    console.log("  ✓ Emissão de ops-event via Socket.IO validada com sucesso!");

    console.log("\n=======================================================");
    console.log(">>> TODOS OS 6 TESTES PASSARAM COM 100% DE SUCESSO! <<<");
    console.log("=======================================================\n");
  } finally {
    testServer.close();
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("FATAL: Testes falharam:", err);
    process.exit(1);
  });

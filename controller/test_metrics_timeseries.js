process.env.NODE_ENV = "test";
const assert = require("assert");
const http = require("http");
const { app, metricsRingBuffer, coletarAmostraMetrica, sreTracker } = require("./server");

function httpRequest(server, options, body = null) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: "127.0.0.1",
      port: address.port,
      path: options.path,
      method: options.method || "GET",
      headers: {
        ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
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
            body: data ? JSON.parse(data) : null,
            rawText: data
          });
        } catch (_) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: null,
            rawText: data
          });
        }
      });
    });

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runMetricsTests() {
  console.log("=== INICIANDO TESTES DO MOTOR DE MÉTRICAS EM SÉRIE TEMPORAL ===");

  const testServer = http.createServer(app);
  await new Promise(resolve => testServer.listen(0, resolve));
  const port = testServer.address().port;
  console.log(`Metrics test server listening on port ${port}`);

  try {
    // 1. Validar buffer pré-populado
    console.log("\n[1/4] Testando inicialização e amostragem do Ring Buffer...");
    assert(metricsRingBuffer.length >= 30, "Ring Buffer deve ter no mínimo 30 amostras pré-populadas");
    const sample = await coletarAmostraMetrica();
    assert(sample, "Amostra coletada não deve ser nula");
    assert(sample.timestamp && sample.epoch, "Amostra deve ter timestamp ISO e epoch");
    assert(typeof sample.host.cpuPercent === "number", "Host deve ter cpuPercent numérico");
    assert(sample.host.ramTotalMb > 0, "Host deve ter ramTotalMb > 0");
    assert(sample.host.ramUsedMb > 0, "Host deve ter ramUsedMb > 0");
    assert(sample.host.ramFreeMb >= 0, "Host deve ter ramFreeMb >= 0");

    const targetNodes = ["ctrl-primary", "ctrl-backup", "game-node-1", "game-node-2", "game-node-3"];
    for (const node of targetNodes) {
      assert(sample.containers[node], `Container ${node} deve estar presente na amostra`);
      assert(sample.containers[node].status, `Container ${node} deve ter status definido`);
      assert(typeof sample.containers[node].ramMb === "number", `Container ${node} deve ter ramMb numérico`);
    }
    assert(sample.app.healthyServers >= 0, "App deve conter healthyServers");
    assert(sample.sre.uptimePercent > 0, "SRE deve conter uptimePercent");
    console.log("  ✓ Ring Buffer e estrutura da amostra validados com sucesso!");

    // 2. Testar GET /api/admin/metrics/timeseries com janelas
    console.log("\n[2/4] Testando endpoint GET /api/admin/metrics/timeseries com janelas (?window=15m, 30m, 60m)...");
    const res15 = await httpRequest(testServer, { path: "/api/admin/metrics/timeseries?window=15m" });
    assert.strictEqual(res15.statusCode, 200, "Status deve ser 200");
    assert.strictEqual(res15.body.ok, true, "ok deve ser true");
    assert.strictEqual(res15.body.window, "15m", "window deve ser 15m");
    assert(Array.isArray(res15.body.samples), "samples deve ser array");
    assert(res15.body.count > 0, "count deve ser > 0");
    assert(res15.body.sre.uptimePercent >= 90, "sre.uptimePercent deve ser válido");
    assert(res15.body.sre.mttrProcessSeconds > 0, "sre.mttrProcessSeconds deve ser válido");
    assert(res15.body.sre.mttrNodeSeconds > 0, "sre.mttrNodeSeconds deve ser válido");
    console.log(`  ✓ Janela 15m retornou ${res15.body.count} amostras com SRE Uptime=${res15.body.sre.uptimePercent}%`);

    const res30 = await httpRequest(testServer, { path: "/api/admin/metrics/timeseries?window=30m" });
    assert.strictEqual(res30.statusCode, 200);
    assert.strictEqual(res30.body.window, "30m");
    console.log(`  ✓ Janela 30m retornou ${res30.body.count} amostras com sucesso`);

    const res60 = await httpRequest(testServer, { path: "/api/admin/metrics/timeseries?window=60m" });
    assert.strictEqual(res60.statusCode, 200);
    assert.strictEqual(res60.body.window, "60m");
    console.log(`  ✓ Janela 60m retornou ${res60.body.count} amostras com sucesso`);

    // 3. Testar GET /api/admin/metrics/export.csv
    console.log("\n[3/4] Testando endpoint GET /api/admin/metrics/export.csv...");
    const resCsv = await httpRequest(testServer, { path: "/api/admin/metrics/export.csv" });
    assert.strictEqual(resCsv.statusCode, 200, "CSV deve responder status 200");
    assert(resCsv.headers["content-type"].includes("text/csv"), "Content-Type deve ser text/csv");
    assert(resCsv.headers["content-disposition"].includes("attachment; filename="), "Content-Disposition deve ser attachment");

    const lines = resCsv.rawText.trim().split("\r\n");
    assert(lines.length >= 31, "CSV deve conter cabeçalho + pelo menos 30 linhas de dados");
    const headerCols = lines[0].split(",");
    assert.strictEqual(headerCols[0], "timestamp_iso", "Primeira coluna deve ser timestamp_iso");
    assert(lines[0].includes("ctrl_primary_ram_mb"), "Deve conter ctrl_primary_ram_mb");
    assert(lines[0].includes("game_node_3_ram_mb"), "Deve conter game_node_3_ram_mb");
    assert(lines[0].includes("sre_uptime_pct"), "Deve conter sre_uptime_pct");
    console.log(`  ✓ CSV export validado com sucesso! Total de linhas geradas: ${lines.length}`);

    // 4. Testar métricas SRE sob estresse/caos
    console.log("\n[4/4] Testando atualização dinâmica de incidentes SRE...");
    const initialIncidents = sreTracker.totalIncidents;
    // Disparar requisição de caos
    await httpRequest(testServer, {
      path: "/api/admin/chaos/kill-process",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, { node: "game-node-1", port: 4001 });

    assert(sreTracker.totalIncidents >= initialIncidents + 1, "totalIncidents deve ter incrementado");
    console.log(`  ✓ Incidente registrado no SRE Tracker (Total: ${sreTracker.totalIncidents})`);

    // Disparar heal
    await httpRequest(testServer, {
      path: "/api/admin/chaos/heal",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {});
    assert(sreTracker.totalAutoHealings > 0, "totalAutoHealings deve ter incrementado após heal");
    console.log(`  ✓ Auto-healing registrado no SRE Tracker (Total: ${sreTracker.totalAutoHealings})`);

    // 5. Testar janelas ultra-rápidas (1m, 3m, 5m) e annotations
    console.log("\n[5/5] Testando janelas ultra-rápidas (1m, 3m, 5m) e endpoint /api/admin/metrics/lifecycle-timeline...");
    const res1m = await httpRequest(testServer, { path: "/api/admin/metrics/timeseries?window=1m" });
    assert.strictEqual(res1m.statusCode, 200);
    assert.strictEqual(res1m.body.window, "1m");
    assert(Array.isArray(res1m.body.annotations), "annotations deve ser um array");
    console.log(`  ✓ Janela 1m retornou ${res1m.body.count} amostras e ${res1m.body.annotations.length} annotations`);

    const res3m = await httpRequest(testServer, { path: "/api/admin/metrics/timeseries?window=3m" });
    assert.strictEqual(res3m.statusCode, 200);
    assert.strictEqual(res3m.body.window, "3m");
    console.log(`  ✓ Janela 3m retornou ${res3m.body.count} amostras com sucesso`);

    const res5m = await httpRequest(testServer, { path: "/api/admin/metrics/timeseries?window=5m" });
    assert.strictEqual(res5m.statusCode, 200);
    assert.strictEqual(res5m.body.window, "5m");
    console.log(`  ✓ Janela 5m retornou ${res5m.body.count} amostras com sucesso`);

    // Testar /api/admin/metrics/lifecycle-timeline
    const resLifecycle = await httpRequest(testServer, { path: "/api/admin/metrics/lifecycle-timeline" });
    assert.strictEqual(resLifecycle.statusCode, 200);
    assert.strictEqual(resLifecycle.body.ok, true);
    assert(Array.isArray(resLifecycle.body.incidents), "incidents deve ser array");
    assert(Array.isArray(resLifecycle.body.annotations), "annotations deve ser array");
    assert(resLifecycle.body.incidents.length > 0, "deve conter pelo menos 1 incidente");
    const latestInc = resLifecycle.body.incidents[0];
    assert(latestInc.stages && latestInc.stages.length >= 2, "incidente deve conter stages detalhados");
    console.log(`  ✓ Lifecycle Timeline validada: ${resLifecycle.body.count} incidentes registrados com estágios detalhados`);

    console.log("\n=======================================================");
    console.log(">>> TODOS OS TESTES DE MÉTRICAS E LIFECYCLE PASSARAM! <<<");
    console.log("=======================================================\n");
    process.exit(0);
  } finally {
    testServer.close();
  }
}

runMetricsTests().catch((err) => {
  console.error("FALHA NOS TESTES DE MÉTRICAS:", err);
  process.exit(1);
});

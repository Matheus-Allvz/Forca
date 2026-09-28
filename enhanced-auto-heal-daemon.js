#!/usr/bin/env node

/**
 * AUTO-HEALING RESILIENTE TOTAL - SISTEMAS DISTRIBUÍDOS
 * VPS: 15.204.243.66
 *
 * Responsabilidades:
 * 1. Monitorar e ressuscitar automaticamente os CONTROLLERS (ctrl-primary, ctrl-backup)
 *    - Se um controller for desligado (teste de caos), ressuscita em 6 segundos
 * 2. Monitorar e ressuscitar os WORKERS NOMINAIS (game-node-1, game-node-2)
 *    - Se um worker for desligado, tenta dar start imediato
 * 3. Se um worker falhar criticamente, provisiona game-node-3 como substituto elástico
 */

const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

const CONFIG = {
  minHealthyNodes: 2,
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS, 10) || 2500,
  httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS, 10) || 1500,
  controllerGraceMs: parseInt(process.env.CONTROLLER_FAILOVER_GRACE_MS, 10) || 60000,
  workerRestartGraceMs: parseInt(process.env.WORKER_RESTART_GRACE_MS, 10) || 6000,
  logFile: '/var/log/forca-auto-heal.log',
  controllers: ['ctrl-primary', 'ctrl-backup'],
  workers: {
    'game-node-1': { ip: '10.10.10.101', ports: [4001, 4002] },
    'game-node-2': { ip: '10.10.10.102', ports: [4001, 4002] },
    'game-node-3': { ip: '10.10.10.103', ports: [4001, 4002] }
  }
};

const stoppedTimestamps = new Map();

function log(msg, meta = {}) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] [AUTO-HEAL] ${msg} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  console.log(entry);
  try {
    fs.appendFileSync(CONFIG.logFile, entry + '\n');
  } catch (err) {}
}

function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    throw new Error(`Command failed: ${cmd}\nError: ${err.stderr || err.message}`);
  }
}

async function checkPortHealth(ip, port) {
  return new Promise((resolve) => {
    const req = http.get(`http://${ip}:${port}/health`, { timeout: CONFIG.httpTimeoutMs }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true });
        } else {
          resolve({ ok: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'TIMEOUT' });
    });
  });
}

function getIncusInstances() {
  try {
    const raw = runCmd('incus list --format json');
    return JSON.parse(raw);
  } catch (err) {
    log('Falha ao listar instâncias do Incus', { error: err.message });
    return [];
  }
}

let isHealing = false;

async function checkAndHealControllers(instanceMap) {
  for (const ctrl of CONFIG.controllers) {
    const inst = instanceMap.get(ctrl);
    if (!inst || inst.status === 'Stopped') {
      const now = Date.now();
      const firstSeen = stoppedTimestamps.get(ctrl) || now;
      stoppedTimestamps.set(ctrl, firstSeen);

      // Aguarda janela de observação/carência de failover antes de ressuscitar (evita flapping)
      const elapsed = now - firstSeen;
      if (elapsed >= CONFIG.controllerGraceMs) {
        log(`[AUTO-HEAL] Controller ${ctrl} parado há ${(elapsed / 1000).toFixed(1)}s. Ressuscitando container...`);
        try {
          runCmd(`incus start ${ctrl}`);
          stoppedTimestamps.delete(ctrl);
          log(`[AUTO-HEAL] Controller ${ctrl} religado com sucesso!`);
        } catch (err) {
          log(`[ERRO] Falha ao religar controller ${ctrl}: ${err.message}`);
        }
      } else {
        log(`[AUTO-HEAL] Controller ${ctrl} em observação de failover (${((CONFIG.controllerGraceMs - elapsed) / 1000).toFixed(0)}s restantes antes de religar)`);
      }
    } else if (inst.status === 'Running') {
      stoppedTimestamps.delete(ctrl);
    }
  }
}

async function checkAndHealWorkers(instanceMap) {
  // 1. Ressuscita nós nominais se estiverem apenas parados (ex: stop forçado pelo operador)
  for (const nodeName of ['game-node-1', 'game-node-2']) {
    const inst = instanceMap.get(nodeName);
    if (inst && inst.status === 'Stopped') {
      const now = Date.now();
      const firstSeen = stoppedTimestamps.get(nodeName) || now;
      stoppedTimestamps.set(nodeName, firstSeen);

      const elapsed = now - firstSeen;
      if (elapsed >= CONFIG.workerRestartGraceMs) {
        log(`[AUTO-HEAL] Worker ${nodeName} parado há ${(elapsed / 1000).toFixed(1)}s. Religando container...`);
        try {
          runCmd(`incus start ${nodeName}`);
          stoppedTimestamps.delete(nodeName);
          log(`[AUTO-HEAL] Worker ${nodeName} religado com sucesso!`);
        } catch (err) {
          log(`[ERRO] Falha ao religar worker ${nodeName}: ${err.message}`);
        }
      }
    } else if (inst && inst.status === 'Running') {
      stoppedTimestamps.delete(nodeName);
    }
  }

  // 2. Avalia a saúde real das portas HTTP dos workers
  let healthyNodesCount = 0;
  for (const [nodeName, nodeConf] of Object.entries(CONFIG.workers)) {
    const inst = instanceMap.get(nodeName);
    if (inst && inst.status === 'Running') {
      let healthyPorts = 0;
      for (const port of nodeConf.ports) {
        const check = await checkPortHealth(nodeConf.ip, port);
        if (check.ok) healthyPorts++;
      }
      if (healthyPorts === nodeConf.ports.length) {
        healthyNodesCount++;
      }
    }
  }

  // 3. Se pool < 2 e game-node-3 não estiver saudável, aciona provisionamento elástico
  if (healthyNodesCount < CONFIG.minHealthyNodes && !isHealing) {
    const inst3 = instanceMap.get('game-node-3');
    if (!inst3 || inst3.status !== 'Running') {
      await provisionSubstituteNode('game-node-3');
    }
  }
}

async function provisionSubstituteNode(nodeName = 'game-node-3') {
  if (isHealing) return;
  isHealing = true;
  const startTime = Date.now();
  log(`>>> [EVENTO DE CAOS] Disparando Auto-Healing Elástico para provisionar ${nodeName} <<<`);

  try {
    const instances = getIncusInstances();
    const existing = instances.find(i => i.name === nodeName);
    if (existing) {
      log(`Limpando container residual ${nodeName}...`);
      runCmd(`incus delete ${nodeName} --force`);
    }

    log(`[1/4] Clonando ${nodeName} a partir de forca-base...`);
    runCmd(`incus launch forca-base ${nodeName} --network incusbr0 < /dev/null`);

    log(`[2/4] Fixando IP 10.10.10.103...`);
    runCmd(`incus config device set ${nodeName} eth0 ipv4.address 10.10.10.103`);
    runCmd(`incus restart ${nodeName}`);

    // Espera boot
    for (let i = 0; i < 20; i++) {
      try {
        const status = runCmd(`incus exec ${nodeName} -- systemctl is-system-running 2>/dev/null || true`);
        if (status === 'running' || status === 'degraded') break;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1000));
    }

    log(`[3/4] Configurando portas 4001 e 4002...`);
    const env4001 = `PORT=4001\\nSERVER_ID=node3-game-server-4001\\nCONTROLLER_URL=http://10.10.10.10:8088\\nPUBLIC_SERVER_URL=https://forca.matheus-alves.dev/servers/node3-p1\\nINTERNAL_SERVER_URL=http://10.10.10.103:4001\\n`;
    runCmd(`incus exec ${nodeName} -- bash -c "printf '${env4001}' > /etc/default/game-server-4001"`);

    const env4002 = `PORT=4002\\nSERVER_ID=node3-game-server-4002\\nCONTROLLER_URL=http://10.10.10.10:8088\\nPUBLIC_SERVER_URL=https://forca.matheus-alves.dev/servers/node3-p2\\nINTERNAL_SERVER_URL=http://10.10.10.103:4002\\n`;
    runCmd(`incus exec ${nodeName} -- bash -c "printf '${env4002}' > /etc/default/game-server-4002"`);

    // Injeta a versão mais recente do código do game server no nó elástico a partir de um worker ativo ou do host
    try {
      runCmd(`incus exec game-node-2 -- cat /opt/forca/game-server/server.js | incus exec ${nodeName} -- sh -c "cat > /opt/forca/game-server/server.js"`);
    } catch (syncErr) {
      log(`[WARN] Tentando sync a partir do host: ${syncErr.message}`);
      runCmd(`incus file push /opt/forca/game-server/server.js ${nodeName}/opt/forca/game-server/server.js 2>/dev/null || true`);
    }

    runCmd(`incus exec ${nodeName} -- systemctl enable --now game-server@4001 game-server@4002`);
    log(`[4/4] Nó ${nodeName} ativo e pronto em ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
  } catch (err) {
    log(`[ERRO] Falha ao provisionar nó substituto: ${err.message}`);
  } finally {
    isHealing = false;
  }
}

async function loop() {
  try {
    const instances = getIncusInstances();
    const instanceMap = new Map(instances.map(inst => [inst.name, inst]));

    await checkAndHealControllers(instanceMap);
    await checkAndHealWorkers(instanceMap);
  } catch (err) {
    log(`Erro no loop de monitoramento: ${err.message}`);
  }
}

log(`[INIT] Daemon de Auto-Healing Total ativo (Monitora Controllers e Workers)`);
setInterval(loop, CONFIG.pollIntervalMs);
loop();

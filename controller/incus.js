const http = require("http");
const fs = require("fs");
const path = require("path");

function getIncusSocketPath() {
  if (process.env.INCUS_SOCKET_PATH) {
    return process.env.INCUS_SOCKET_PATH;
  }
  const possiblePaths = [
    "/run/incus.socket",
    "/var/lib/incus/unix.socket",
    "/var/snap/incus/common/incus/unix.socket"
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "/run/incus.socket";
}

function isIncusAvailable() {
  const socketPath = getIncusSocketPath();
  try {
    return fs.existsSync(socketPath);
  } catch (_) {
    return false;
  }
}

function incusRequest(method, urlPath, body = null, timeoutMs = 15000) {
  const socketPath = getIncusSocketPath();
  return new Promise((resolve, reject) => {
    if (!isIncusAvailable()) {
      return reject(new Error(`Incus socket not found at ${socketPath}`));
    }

    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      socketPath,
      path: urlPath,
      method,
      headers: {
        ...(payload ? {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        } : {})
      },
      timeout: timeoutMs
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data || "{}");
          if (res.statusCode >= 400) {
            const msg = parsed.error || parsed.message || `HTTP ${res.statusCode}: ${data}`;
            return reject(new Error(msg));
          }
          resolve(parsed);
        } catch (e) {
          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Incus request timeout after ${timeoutMs}ms: ${method} ${urlPath}`));
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function waitForOperation(opPath, timeoutSec = 15) {
  if (!opPath) return null;
  try {
    const cleanPath = opPath.startsWith("/1.0/") ? opPath : `/1.0/${opPath.replace(/^\/+/, "")}`;
    return await incusRequest("GET", `${cleanPath}/wait?timeout=${timeoutSec}`);
  } catch (err) {
    console.warn(`[Incus] Operation wait (${opPath}) warning:`, err.message);
    return null;
  }
}

const STATIC_IPS = {
  "ctrl-primary": "10.10.10.10",
  "ctrl-backup": "10.10.10.20",
  "game-node-1": "10.10.10.101",
  "game-node-2": "10.10.10.102",
  "game-node-3": "10.10.10.103"
};

function getFallbackContainers(servidoresRegistrados = new Map(), heartbeatTimeoutMs = 15000) {
  const cutoff = Date.now() - heartbeatTimeoutMs;
  const nodes = [
    { name: "ctrl-primary", ip: "10.10.10.10", defaultStatus: "Running", ramMb: 48.5 },
    { name: "ctrl-backup", ip: "10.10.10.20", defaultStatus: "Running", ramMb: 44.2 },
    { name: "game-node-1", ip: "10.10.10.101", defaultStatus: "Running", ramMb: 82.1 },
    { name: "game-node-2", ip: "10.10.10.102", defaultStatus: "Running", ramMb: 79.4 },
    { name: "game-node-3", ip: "10.10.10.103", defaultStatus: "Stopped", ramMb: 0 }
  ];

  return nodes.map((node) => {
    let isHealthy = true;
    if (node.name.startsWith("game-node-")) {
      const nodeSuffix = node.name.replace("game-node-", "node");
      const serversOnNode = [...servidoresRegistrados.values()].filter((s) =>
        s.serverId.includes(nodeSuffix) || (s.internalUrl && s.internalUrl.includes(node.ip))
      );
      if (serversOnNode.length > 0) {
        isHealthy = serversOnNode.some((s) => s.lastHeartbeat >= cutoff);
      } else if (node.defaultStatus === "Stopped") {
        isHealthy = false;
      }
    }
    const status = isHealthy ? node.defaultStatus : "Stopped";
    const ramUsed = status === "Running" ? Math.round(node.ramMb * 1024 * 1024) : 0;
    return {
      name: node.name,
      status,
      ip: node.ip,
      ramUsed,
      ramUsedMb: status === "Running" ? node.ramMb : 0,
      memoryUsage: ramUsed
    };
  });
}

async function getContainers(servidoresRegistrados = new Map(), heartbeatTimeoutMs = 15000) {
  if (!isIncusAvailable()) {
    return getFallbackContainers(servidoresRegistrados, heartbeatTimeoutMs);
  }

  try {
    const instancesRes = await incusRequest("GET", "/1.0/instances?recursion=1");
    const instances = instancesRes?.metadata || [];

    if (!Array.isArray(instances) || instances.length === 0) {
      return getFallbackContainers(servidoresRegistrados, heartbeatTimeoutMs);
    }

    const containers = await Promise.all(instances.map(async (inst) => {
      let state = inst.state;
      if (!state && inst.status === "Running") {
        try {
          const stateRes = await incusRequest("GET", `/1.0/instances/${encodeURIComponent(inst.name)}/state`);
          state = stateRes?.metadata;
        } catch (_) {}
      }

      let ip = null;
      if (state?.network) {
        for (const iface of Object.values(state.network)) {
          if (iface && Array.isArray(iface.addresses)) {
            const inetAddr = iface.addresses.find((a) =>
              a.family === "inet" && a.scope !== "local" && !a.address.startsWith("127.")
            );
            if (inetAddr) {
              ip = inetAddr.address;
              break;
            }
          }
        }
      }

      if (!ip) {
        ip = STATIC_IPS[inst.name] || "N/A";
      }

      const ramUsed = state?.memory?.usage || 0;
      const ramUsedMb = Number((ramUsed / (1024 * 1024)).toFixed(1));

      return {
        name: inst.name,
        status: state?.status || inst.status || "Unknown",
        ip,
        ramUsed,
        ramUsedMb,
        memoryUsage: ramUsed
      };
    }));

    const targetNames = ["ctrl-primary", "ctrl-backup", "game-node-1", "game-node-2", "game-node-3"];
    for (const name of targetNames) {
      if (!containers.some((c) => c.name === name)) {
        containers.push({
          name,
          status: "Stopped",
          ip: STATIC_IPS[name] || "10.10.10.103",
          ramUsed: 0,
          ramUsedMb: 0,
          memoryUsage: 0
        });
      }
    }

    return containers;
  } catch (err) {
    console.warn("[Incus] Failed to fetch live containers, using fallback:", err.message);
    return getFallbackContainers(servidoresRegistrados, heartbeatTimeoutMs);
  }
}

async function killProcess(node, port = null, servidoresRegistrados = new Map()) {
  if (isIncusAvailable()) {
    const cmd = port
      ? `systemctl kill -s 9 game-server@${port} 2>/dev/null || fuser -k -9 ${port}/tcp 2>/dev/null || pkill -9 -f "PORT=${port}" || pkill -9 -f "game-server/server.js"`
      : `pkill -9 -f game-server/server.js || pkill -9 -f "node.*server.js"`;

    const execRes = await incusRequest("POST", `/1.0/instances/${encodeURIComponent(node)}/exec`, {
      command: ["sh", "-c", cmd],
      environment: {},
      "wait-for-websocket": false,
      "record-output": true,
      interactive: false
    });

    if (execRes?.operation) {
      await waitForOperation(execRes.operation, 10);
    }

    const nodeSuffix = String(node).replace("game-node-", "node");
    let affected = 0;
    for (const s of servidoresRegistrados.values()) {
      const matchNode = s.serverId.includes(nodeSuffix) || (s.internalUrl && s.internalUrl.includes(node));
      const matchPort = !port || Number(s.publicPort) === Number(port);
      if (matchNode && matchPort) {
        s.lastHeartbeat = 0; // expire heartbeat immediately
        s.previouslyHealthy = false;
        affected += 1;
      }
    }

    return { ok: true, node, port, affected, simulated: false };
  }

  // Simulation mode (dev / test environment without incus socket)
  const nodeSuffix = String(node).replace("game-node-", "node");
  let affected = 0;
  for (const s of servidoresRegistrados.values()) {
    const matchNode = s.serverId.includes(nodeSuffix) || (s.internalUrl && s.internalUrl.includes(node));
    const matchPort = !port || Number(s.publicPort) === Number(port);
    if (matchNode && matchPort) {
      s.lastHeartbeat = 0; // expire heartbeat immediately
      s.previouslyHealthy = false;
      affected += 1;
    }
  }

  return { ok: true, node, port, affected, simulated: true };
}

async function killNode(node, servidoresRegistrados = new Map()) {
  if (isIncusAvailable()) {
    const stopRes = await incusRequest("PUT", `/1.0/instances/${encodeURIComponent(node)}/state`, {
      action: "stop",
      force: true,
      timeout: 30
    });

    if (stopRes?.operation) {
      await waitForOperation(stopRes.operation, 15);
    }

    return { ok: true, node, simulated: false };
  }

  // Simulation mode
  const nodeSuffix = String(node).replace("game-node-", "node");
  let affected = 0;
  for (const s of servidoresRegistrados.values()) {
    if (s.serverId.includes(nodeSuffix) || (s.internalUrl && s.internalUrl.includes(node))) {
      s.lastHeartbeat = 0;
      s.previouslyHealthy = false;
      affected += 1;
    }
  }

  return { ok: true, node, affected, simulated: true };
}

async function stopPrimary() {
  if (isIncusAvailable()) {
    try {
      const stopRes = await incusRequest("PUT", "/1.0/instances/ctrl-primary/state", {
        action: "stop",
        force: true,
        timeout: 5
      });
      if (stopRes?.operation) {
        await waitForOperation(stopRes.operation, 5);
      }
      return { ok: true, simulated: false };
    } catch (err) {
      console.warn("[Incus] stopPrimary error:", err.message);
    }
  }
  return { ok: true, simulated: true };
}

async function healCluster(servidoresRegistrados = new Map()) {
  const recovered = [];

  if (isIncusAvailable()) {
    const nominalNodes = ["ctrl-primary", "ctrl-backup", "game-node-1", "game-node-2"];

    for (const node of nominalNodes) {
      try {
        const stateRes = await incusRequest("GET", `/1.0/instances/${encodeURIComponent(node)}/state`);
        if (stateRes?.metadata?.status !== "Running") {
          const startRes = await incusRequest("PUT", `/1.0/instances/${encodeURIComponent(node)}/state`, {
            action: "start"
          });
          if (startRes?.operation) {
            await waitForOperation(startRes.operation, 15);
          }
          recovered.push(node);
        }

        if (node.startsWith("game-node-")) {
          await incusRequest("POST", `/1.0/instances/${encodeURIComponent(node)}/exec`, {
            command: ["systemctl", "start", "game-server@4001", "game-server@4002"],
            environment: {},
            "wait-for-websocket": false,
            "record-output": false,
            interactive: false
          }).catch(() => {});
        }
      } catch (err) {
        console.warn(`[Incus] Error healing node ${node}:`, err.message);
      }
    }

    return { ok: true, recovered, simulated: false };
  }

  // Simulation mode: Restores the 4 nominal servers with active heartbeats
  const nominal = [
    { serverId: "node1-game-server-4001", publicPort: 4001, internalUrl: "http://10.10.10.101:4001", publicUrl: "https://forca.matheus-alves.dev/servers/node1-p1" },
    { serverId: "node1-game-server-4002", publicPort: 4002, internalUrl: "http://10.10.10.101:4002", publicUrl: "https://forca.matheus-alves.dev/servers/node1-p2" },
    { serverId: "node2-game-server-4001", publicPort: 4001, internalUrl: "http://10.10.10.102:4001", publicUrl: "https://forca.matheus-alves.dev/servers/node2-p1" },
    { serverId: "node2-game-server-4002", publicPort: 4002, internalUrl: "http://10.10.10.102:4002", publicUrl: "https://forca.matheus-alves.dev/servers/node2-p2" }
  ];

  for (const s of nominal) {
    const existing = servidoresRegistrados.get(s.serverId);
    if (existing) {
      existing.lastHeartbeat = Date.now();
      existing.previouslyHealthy = true;
    } else {
      servidoresRegistrados.set(s.serverId, {
        ...s,
        activeGames: 0,
        lastHeartbeat: Date.now(),
        previouslyHealthy: true
      });
    }
    recovered.push(s.serverId);
  }

  return { ok: true, recovered, simulated: true };
}

module.exports = {
  getIncusSocketPath,
  isIncusAvailable,
  incusRequest,
  waitForOperation,
  getContainers,
  getFallbackContainers,
  killProcess,
  killNode,
  stopPrimary,
  healCluster
};

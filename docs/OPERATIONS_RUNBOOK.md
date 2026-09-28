# Runbook de Operações & SRE - Cluster Forca Distribuída

Este documento descreve os procedimentos operacionais para administração, manutenção, injeção de falhas controladas e recuperação de desastres do cluster de alta disponibilidade do **Jogo da Forca Distribuído**.

---

## 1. Visão Geral da Topologia Operacional

O ambiente de produção opera sobre containers de sistema **Incus LXC** em uma rede privada isolada (`10.10.10.0/24`) com proxy reverso **Caddy** na borda:

```
                               [ Internet ]
                                    │
                         HTTPS :443 │ Caddy Ingress (Host)
                                    ▼
       ┌────────────────────────────┴────────────────────────────┐
       │                                                         │
       ▼                                                         ▼
[ ctrl-primary ] (10.10.10.10)                          [ ctrl-backup ] (10.10.10.20)
Ativo (lb_policy first)                                 Standby Ativo (Health Check)
       │                                                         │
       └────────────────────────────┬────────────────────────────┘
                                    │
               Heartbeats (15s) & Sincronização de Estado
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
[ game-node-1 ] (10.10.10.101) [ game-node-2 ] (10.10.10.102) [ game-node-3 ] (10.10.10.103)
Ports :4001, :4002             Ports :4001, :4002             Nó Elástico Dinâmico
```

---

## 2. Verificação de Saúde do Cluster

### 2.1. Status dos Containers Incus
No host da VPS (`deploy@15.204.243.66`):
```bash
incus list
```
Saída esperada:
- `ctrl-primary`: RUNNING (10.10.10.10)
- `ctrl-backup`: RUNNING (10.10.10.20)
- `game-node-1`: RUNNING (10.10.10.101)
- `game-node-2`: RUNNING (10.10.10.102)
- `game-node-3`: RUNNING ou STOPPED (nó elástico dinâmico)

### 2.2. Status do Daemon de Auto-Healing
```bash
systemctl status forca-auto-heal.service
tail -f /var/log/forca-auto-heal.log
```

### 2.3. Health Checks HTTP
```bash
# Ingress Caddy (borda)
curl -k https://127.0.0.1:4443/health

# Controllers internos
curl http://10.10.10.10:8088/health
curl http://10.10.10.20:8088/health

# Game Nodes
curl http://10.10.10.101:4001/health
curl http://10.10.10.102:4001/health
```

---

## 3. Procedimentos de Manutenção e Deploy

### 3.1. Deploy de Nova Versão de Código
Para propagar atualizações de código do repositório para todos os containers ativos sem downtime:
```bash
cd /home/deploy/forca
git pull origin main
./deploy_observability.sh
```
O script sincroniza atomicamente:
1. `controller/` e `web-client/` em `ctrl-primary` e `ctrl-backup`
2. `game-server/` em `game-node-1`, `game-node-2` e `game-node-3`
3. Reinicia os serviços via systemd (`systemctl restart controller` e `systemctl restart game-server@4001 game-server@4002`)
4. Valida a saúde dos 6 processos de jogo.

---

## 4. Procedimentos de Resolução de Incidentes

### 4.1. Falha / Queda do Controller Primário
* **Detecção:** O Caddy detecta falha ativa no upstream `10.10.10.10:8088` e comuta as novas conexões instantaneamente para `10.10.10.20:8088` (`ctrl-backup`).
* **Auto-Healing:** O daemon `forca-auto-heal` detecta o container parado, respeita a janela de carência de failover (60s para evitar *flapping*) e ressuscita o `ctrl-primary`.
* **Intervenção Manual (se necessário):**
  ```bash
  incus start ctrl-primary
  incus exec ctrl-primary -- systemctl restart controller
  ```

### 4.2. Queda de um Game Node (Data Plane)
* **Detecção:** O controller detecta ausência de heartbeat (> 15s) ou erro de I/O e aciona `migrarPartida`.
* **Migração:** As partidas ativas são transferidas para outro nó do pool; clientes reconectam automaticamente via `reconnectToken`.
* **Auto-Healing:** Se o pool cair para menos de 2 nós saudáveis, o daemon clona e inicia imediatamente o `game-node-3` a partir da imagem `forca-base`.
* **Intervenção Manual (se necessário):**
  ```bash
  incus start game-node-1
  incus exec game-node-1 -- systemctl restart game-server@4001 game-server@4002
  ```

### 4.3. Bloqueio de Acesso ou Erro 403 nas Rotas de Operação
* As rotas `/ops*` e `/api/admin/*` são protegidas por autenticação de perímetro (`forward_auth` via `vps-auth-gateway` na porta 8099).
* Se o gateway estiver inativo:
  ```bash
  systemctl status vps-auth-gateway
  sudo systemctl restart vps-auth-gateway
  ```

---

## 5. Variáveis de Ambiente e Configuração

### 5.1. Controladores (`/etc/default/forca-controller`)
```env
PORT=8088
ROLE=primary # ou backup
PEER_CONTROLLER_URL=http://10.10.10.20:8088
CLUSTER_SECRET=forca-internal-secret-2026
```

### 5.2. Servidores de Jogo (`/etc/default/game-server-4001`)
```env
PORT=4001
SERVER_ID=node1-game-server-4001
CONTROLLER_URL=http://10.10.10.10:8088
PUBLIC_SERVER_URL=https://forca.matheus-alves.dev/servers/node1-p1
INTERNAL_SERVER_URL=http://10.10.10.101:4001
CLUSTER_SECRET=forca-internal-secret-2026
```

### 5.3. Daemon de Auto-Healing (`/etc/systemd/system/forca-auto-heal.service`)
```env
POLL_INTERVAL_MS=2500
CONTROLLER_FAILOVER_GRACE_MS=60000
WORKER_RESTART_GRACE_MS=6000
```

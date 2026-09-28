# Jogo da Forca Distribuído & Resiliente

Sistema distribuído de alta disponibilidade e tolerância a falhas para partidas em tempo real do clássico **Jogo da Forca**, implementado em Node.js sobre containers de sistema **Incus LXC** e orquestração autônoma com **Auto-Healing**.

[![Arquitetura](https://img.shields.io/badge/Architecture-Distributed_LXC_Cluster-blue.svg)](#arquitetura-do-sistema)
[![Alta Disponibilidade](https://img.shields.io/badge/HA-Active--Passive_Failover-green.svg)](#alta-disponibilidade--tolerância-a-falhas)
[![Observabilidade](https://img.shields.io/badge/SRE-Live_Gantt_Telemetry-purple.svg)](#observabilidade--painel-sre)

---

## 👥 Alunos / Autores

* **Matheus Alves** ([@Matheus-Allvz](https://github.com/Matheus-Allvz)) - Arquitetura Distribuída, Control Plane HA, Auto-Healing e SRE
* **Marcos Vinicius Brandão** ([@MarcosViniciusBrandao](https://github.com/MarcosViniciusBrandao)) - Design System Front-End e UX/UI da Arena
* **Lavínia Maria Moreira** - Colaboração e Documentação

---

## 🌐 Endpoints de Produção

* **Aplicação Principal (Lobby & Jogo):** [https://forca.matheus-alves.dev](https://forca.matheus-alves.dev)
* **Painel de Operações & SRE (Gantt, Forensics & Caos):** [https://forca.matheus-alves.dev/ops.html](https://forca.matheus-alves.dev/ops.html)
* **Monitor Simplificado:** [https://forca.matheus-alves.dev/monitor.html](https://forca.matheus-alves.dev/monitor.html)
* **Métricas do Cluster (Prometheus/JSON):** [https://forca.matheus-alves.dev/metrics](https://forca.matheus-alves.dev/metrics)
* **Health Check Ativo:** [https://forca.matheus-alves.dev/health](https://forca.matheus-alves.dev/health)

---

## 🏗️ Arquitetura do Sistema

O sistema é dividido estritamente em **Plano de Controle (Control Plane)**, **Plano de Dados (Data Plane)** e **Borda de Rede (Edge Ingress)**:

```
                                  [ Internet / Usuários ]
                                             │
                                HTTPS :443   │ Caddy Ingress (Host)
                         [ forward_auth @ vps-auth-gateway :8099 ]
                                             ▼
       ┌─────────────────────────────────────┴─────────────────────────────────────┐
       │                                                                           │
       ▼                                                                           ▼
[ ctrl-primary ] (10.10.10.10)                                            [ ctrl-backup ] (10.10.10.20)
Control Plane Ativo                                                       Standby Ativo Sincronizado
(lb_policy first no Caddy)                                                (Eleição automática em caso de queda)
       │                                                                           │
       └─────────────────────────────────────┬─────────────────────────────────────┘
                                             │
                   Heartbeats Periódicos (15s) & Sincronização de Estado (Tokens)
                                             │
       ┌─────────────────────────────────────┼─────────────────────────────────────┐
       ▼                                     ▼                                     ▼
[ game-node-1 ] (10.10.10.101)         [ game-node-2 ] (10.10.10.102)         [ game-node-3 ] (10.10.10.103)
Ports :4001, :4002                     Ports :4001, :4002                     Nó Elástico Dinâmico
Data Plane Nominal                     Data Plane Nominal                     (Clonado via forca-base)
```

### 1. Ingress & Roteamento de Borda (Caddy)
* **Active Health Checking:** O proxy reverso Caddy monitora a porta `:8088` dos controladores a cada 1 segundo. Se o `ctrl-primary` falhar, comuta o tráfego de controle instantaneamente para o `ctrl-backup` (`lb_policy first`) sem retornar erro 502/503.
* **Isolamento de Perímetro:** Rotas `/internal/*` são bloqueadas diretamente na borda (HTTP 403) para requisições externas.
* **Proteção de Operações:** Rotas administrativas (`/ops*` e `/api/admin/*`) são protegidas via `forward_auth` pelo gateway de autenticação perimetral.

### 2. Plano de Controle (Control Plane HA)
* **Controladores em Containers LXC:** `ctrl-primary` (10.10.10.10) e `ctrl-backup` (10.10.10.20).
* **Fencing Tokens & Lease Locks:** Prevenção contra *split-brain*. Cada snapshot de partida e transição de estado valida o token da versão.
* **Matchmaking Atômico:** Fila FIFO em memória com bloqueio serializado (*mutex*) para eliminar condições de corrida no pareamento simultâneo de jogadores.

### 3. Plano de Dados (Data Plane)
* **Containers de Processos:** Cada nó executa instâncias dedicadas do `game-server` através de systemd slices (`game-server@4001` e `game-server@4002`), isolando falhas de processo e memória.
* **Comunicação por WebSockets:** Comunicação bidirecional e de baixa latência via Socket.IO para eventos do jogo em tempo real.

### 4. Orquestrador Elástico de Auto-Healing (`enhanced-auto-heal-daemon.js`)
* Daemon autônomo em execução no host que monitora a integridade de containers e portas HTTP:
  * **Ressuscitação Inteligente:** Ressuscita containers caídos respeitando janelas de observação para evitar *flapping* de failover.
  * **Spawn Elástico de Nós:** Se a capacidade do pool cair abaixo de 2 nós saudáveis, clona dinamicamente o `game-node-3` a partir da imagem template `forca-base`, injeta a versão de código mais recente e restabelece a capacidade em segundos.

---

## 🎮 Regras e Mecânicas de Jogo Distribuído

1. **Sala de Espera (Lobby) e Pareamento Estrito:**
   * Capacidade máxima de **2 jogadores por partida**.
   * Quando o 3º jogador entra, aguarda na fila pela chegada do 4º jogador com contagem pública e posição atualizada em tempo real.
2. **Semáforo de Turnos & Prevenção de Condições de Corrida:**
   * Apenas o jogador da vez pode enviar lances.
   * Interface com semáforo visual de 3 estados (verde = seu turno, amarelo = processando/atenção, vermelho = turno do oponente).
3. **Duelo de Forcas Simultâneas (Dois Bonecos):**
   * Ambos os competidores visualizam lado a lado duas forcas completas: a sua própria e a do oponente.
   * Quando uma letra incorreta é tentada, a parte da forca é desenhada instantaneamente para ambos os jogadores.
4. **Penalização por Tempo Limite:**
   * Se o jogador não realizar uma jogada no tempo limite do turno (30s), o tempo esgotado **é contabilizado como erro na forca** (`+1 erro`), desenhando uma parte do corpo e passando a vez ao adversário.
5. **Failover Transparente:**
   * Se o servidor que hospeda a partida cair durante o jogo, o controlador detecta a interrupção, migra o snapshot para um servidor saudável e os clientes reconectam automaticamente via `reconnectToken`, sem perda de progresso (pontuação, vidas, letras e turno restaurados).

---

## 📊 Observabilidade & Painel SRE (`/ops.html`)

O dashboard de operações disponibiliza telemetria avançada de sistemas distribuídos:
* **Swimlane Gantt em Tempo Real:** Visualização temporal de nós e processos com janelas ajustáveis (3s ultra-rápida, 10s, 30s e 60s).
* **Passo a Passo Forense:** Inspetor histórico de eventos para reproduzir incidentes de rede, quedas e recuperações.
* **Métricas de Confiabilidade:** Cálculo contínuo de Uptime real e MTTR (*Mean Time To Recovery*).
* **Injeção de Falhas Controladas (Chaos Testing):** Gatilhos para testar queda forçada de workers e failover do controlador primário.

---

## 🚀 Como Executar o Projeto

### Opção 1: Localmente com Docker Compose

Recomendado para desenvolvimento rápido e testes de lógica:

1. Clone o repositório e crie o `.env`:
   ```bash
   git clone https://github.com/Matheus-Allvz/Forca.git
   cd Forca
   cp .env.example .env
   ```

2. Suba o cluster local (Controller + 4 Game Servers):
   ```bash
   docker compose up --build
   ```

3. Acesse no navegador:
   * **Lobby:** `http://localhost:3000`
   * **Jogo:** `http://localhost:3000/game.html`
   * **Monitor:** `http://localhost:3000/monitor.html`

---

### Opção 2: Localmente sem Docker (Node.js)

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Em terminais separados, inicie o controller e os game servers:
   ```bash
   # Terminal 1 - Controller
   npm run start:controller

   # Terminal 2 - Game Server 1
   PORT=4001 SERVER_ID=game-server-1 node game-server/server.js

   # Terminal 3 - Game Server 2
   PORT=4002 SERVER_ID=game-server-2 node game-server/server.js
   ```

---

### Opção 3: Infraestrutura de Produção na VPS (Cluster Incus LXC)

Toda a infraestrutura de produção está codificada e versionada na pasta [`infra/`](infra/):

1. **Preparação do Host e Rede Incus:**
   ```bash
   sudo ./infra/incus/setup-phase1-host.sh
   ```
2. **Criação do Template Base (`forca-base`):**
   ```bash
   ./infra/incus/setup-phase2-template.sh
   ./infra/incus/publish_template.sh
   ```
3. **Provisionamento do Cluster:**
   ```bash
   ./infra/cluster/apply_ops_cluster.sh
   ```
4. **Configuração de Borda Caddy & Autenticação:**
   ```bash
   sudo ./infra/caddy/update_caddyfile.sh
   sudo python3 ./infra/security/apply_auth_rules.py
   ```
5. **Ativação do Auto-Healing:**
   ```bash
   sudo systemctl enable --now forca-auto-heal.service
   ```

---

## 📁 Estrutura do Repositório

```
├── controller/               # Lógica do Controller / Orquestrador e Eleição
│   ├── incus.js             # Integração com API Incus e gestão de containers
│   ├── server.js            # API HTTP, Matchmaking, Reconciliação e Telemetria
│   └── test_*.js            # Testes unitários e de estresse de métricas
├── game-server/              # Lógica de negócio do Jogo da Forca
│   ├── Dockerfile           # Imagem para execução em containers
│   └── server.js            # Servidor Socket.IO, regras de turno e sincronização
├── web-client/public/        # Interface de usuário (Front-end SPA)
│   ├── index.html / lobby.js# Sala de espera e fila de matchmaking
│   ├── game.html / game.js  # Arena de duelo com forcas duplas e semáforo
│   ├── ops.html / ops.js    # Painel SRE com Gantt swimlane e forense
│   └── monitor.html         # Monitor simplificado de nós
├── infra/                    # Infraestrutura como Código (IaC) do Cluster
│   ├── incus/               # Scripts de setup de rede e templates de containers
│   ├── cluster/             # Provisionamento de controladores e workers
│   ├── systemd/             # Units de serviço do controller, gameservers e auto-heal
│   ├── caddy/               # Roteamento de borda, proxies e bloqueios
│   └── security/            # Regras e scripts de isolamento de perímetro
├── docs/                     # Documentação de Engenharia e Arquitetura
│   ├── OPERATIONS_RUNBOOK.md# Manual de operações, rotinas de SRE e manutenção
│   ├── ARCHITECTURE_SPEC.md # Especificação detalhada da arquitetura distribuída
│   ├── CHAOS_TEST_REPORT.md # Relatório dos testes de caos e resiliência
│   └── evidence/            # Logs e artefatos de evidência dos testes de carga
├── enhanced-auto-heal-daemon.js # Daemon de Auto-Healing em produção
├── deploy_observability.sh   # Script de sincronização atômica em produção
└── docker-compose.yml        # Orquestração para ambiente local
```

---

## 📚 Documentação Adicional

* 📖 [Runbook de Operações & SRE](docs/OPERATIONS_RUNBOOK.md)
* 📐 [Especificação Arquitetural Completa](docs/ARCHITECTURE_SPEC.md)
* 🧪 [Relatório de Testes de Caos & Evidências](docs/CHAOS_TEST_REPORT.md)

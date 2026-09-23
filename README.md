# Forca Distribuida

Projeto em Node.js demonstrando uma arquitetura distribuida, resiliente e em tempo real do jogo da forca:

- **Produção:** [https://forca.matheus-alves.dev](https://forca.matheus-alves.dev)
- **Painel de Observabilidade / Monitor:** [https://forca.matheus-alves.dev/monitor.html](https://forca.matheus-alves.dev/monitor.html)
- **Métricas:** [https://forca.matheus-alves.dev/metrics](https://forca.matheus-alves.dev/metrics)
- **Healthcheck:** [https://forca.matheus-alves.dev/health](https://forca.matheus-alves.dev/health)

## Características da Atividade e Requisitos Atendidos

1. **Comunicação por Socket:**
   - Comunicação full-duplex e orientada a eventos via Socket.IO entre Web-Client, Controller e Game-Servers.
2. **Servidor Resiliente (Sistemas Distribuídos & Failover):**
   - Arquitetura com Controller centralizador e múltiplos Game Servers independentes em containers separados.
   - Heartbeat periódico a cada 15s. Se um nó cair ou for interrompido, o Controller detecta a partição de rede/falha e migra automaticamente a partida ativa para outro nó saudável, restaurando integralmente os dados (palavra, letras tentadas, vidas e turno).
3. **Múltiplas Requisições & Sala de Espera (Lobby):**
   - Gerenciamento de fila de espera com contagem pública e posição individual em tempo real.
4. **Máximo de 2 Jogadores por Partida:**
   - Pareamento automático estrito de 2 em 2 jogadores. Um terceiro jogador aguarda na sala de espera pela chegada do quarto.
5. **Semáforo de Controle de Comunicações:**
   - O servidor atua como um semáforo estrito (um jogador por vez).
   - Bloqueio atômico contra condições de corrida e controle visual com semáforo de 3 estados (verde, amarelo, vermelho) para guiar o fluxo de turnos.
6. **Duelo de Forcas e Status Compartilhado (Dois Bonecos Simultâneos):**
   - Ambos os jogadores visualizam simultaneamente duas forcas completas e independentes: a sua própria e a do adversário.
   - Quando um jogador erra uma letra, o respectivo boneco é desenhado na forca dele em tempo real e visualizado por ambos os competidores.
7. **Infraestrutura VPS & Proxy Reverso Caddy:**
   - Roteamento transparente via Caddyfile no domínio `forca.matheus-alves.dev`.
   - Porta alternativa SSH da VPS descoberta e utilizada: **porta 443** (multiplexada via sslh).

## Configuracao com .env

O projeto usa um arquivo `.env` na raiz. Um exemplo completo esta em `.env.example`.

Principais grupos de variaveis:

- `CONTROLLER_PORT`, `PUBLIC_BASE_URL`, `CONTROLLER_INTERNAL_URL`
- `GAME_SERVER_PORT`, `GAME_SERVER_ID`, `GAME_SERVER_PUBLIC_URL`, `GAME_SERVER_INTERNAL_URL`, `CONTROLLER_URL`
- `GAME_SERVER_1_*` ate `GAME_SERVER_4_*` para o `docker compose`

Crie o arquivo de configuracao antes de iniciar (PowerShell):

```powershell
Copy-Item .env.example .env
```

O exemplo ja esta configurado para uso na propria maquina. As URLs publicas usam
`http://localhost`, com o controller na porta 3000 e os servidores nas portas
4001 a 4004. Nao e necessario configurar dominio, HTTPS ou proxy.

`CONTROLLER_URL=http://localhost:3000` e usado ao executar diretamente com Node.js.
No Docker, o Compose substitui essa variavel por `CONTROLLER_INTERNAL_URL`, que
usa `http://controller:3000`. Mantenha os nomes dos servicos nas URLs internas
`GAME_SERVER_1_INTERNAL_URL` ate `GAME_SERVER_4_INTERNAL_URL`: dentro de um
container, `localhost` aponta para o proprio container.

## Rodando localmente com Docker

```bash
docker compose up --build
```

Acesso local na propria maquina:

- Lobby: `http://localhost:3000`
- Tela de jogo: `http://localhost:3000/game.html`
- Monitor do controller: `http://localhost:3000/monitor.html`

## Rodando sem Docker

Instale as dependencias na raiz:

```bash
npm install
```

Com o `.env` da raiz configurado, em terminais separados:

```bash
npm run start:controller
npm run start:server
```

Para subir um segundo servidor manualmente, sobrescreva as variaveis no terminal ou crie outro `.env` especifico antes de iniciar o processo.

Exemplo no PowerShell:

```powershell
$env:PORT=4002
$env:SERVER_ID="game-server-2"
$env:PUBLIC_SERVER_URL="http://localhost:4002"
$env:INTERNAL_SERVER_URL="http://localhost:4002"
$env:CONTROLLER_URL="http://localhost:3000"
node game-server/server.js
```

## Fluxo para demonstracao

1. Abra dois navegadores ou abas anonimas e conecte dois jogadores.
2. Abra um terceiro navegador para mostrar que ele fica em espera por um quarto jogador.
3. Mostre o redirecionamento do lobby para `game.html` quando a partida comeca.
4. Durante uma partida, derrube um dos containers `game-server` e mostre a migracao da partida para o outro servidor.
5. Mostre o cliente reconectando automaticamente ao novo servidor.
6. Acesse `/monitor.html` para exibir observabilidade basica.

## Como acrescentar novos servidores

Para adicionar um novo servidor de jogo, repita o mesmo padrao dos servicos existentes.

### 1. Acrescente variaveis no `.env`

O Compose ja inclui quatro servidores. Exemplo para um quinto servidor:

```env
GAME_SERVER_5_PORT=4005
GAME_SERVER_5_ID=game-server-5
GAME_SERVER_5_PUBLIC_URL=http://localhost:4005
GAME_SERVER_5_INTERNAL_URL=http://game-server-5:4005
```

### 2. Acrescente o servico no `docker-compose.yml`

```yml
  game-server-5:
    container_name: game-server-5
    build:
      context: .
      dockerfile: game-server/Dockerfile
    environment:
      PORT: ${GAME_SERVER_5_PORT}
      SERVER_ID: ${GAME_SERVER_5_ID}
      CONTROLLER_URL: ${CONTROLLER_INTERNAL_URL}
      PUBLIC_SERVER_URL: ${GAME_SERVER_5_PUBLIC_URL}
      INTERNAL_SERVER_URL: ${GAME_SERVER_5_INTERNAL_URL}
    ports:
      - "${GAME_SERVER_5_PORT}:${GAME_SERVER_5_PORT}"
```

Tambem inclua o novo servico em `depends_on` do controller:

```yml
    depends_on:
      - game-server-1
      - game-server-2
      - game-server-3
      - game-server-4
      - game-server-5
```

### 3. Configure a URL publica

Para uso local, use `http://localhost:4005`. Para acesso externo, configure um
endereco acessivel pelo navegador e publique a porta ou use um proxy.

### 4. Recrie os containers

```bash
docker compose up -d --build
```

### Regras para novos servidores

Cada novo servidor precisa ter:

- uma porta unica
- um `SERVER_ID` unico
- uma URL publica acessivel pelo navegador
- uma `INTERNAL_SERVER_URL` que aponte para o nome do servico Docker

Sem isso, o controller nao consegue distribuir e migrar partidas corretamente.

## Observacoes

- O controller mantem estado em memoria e snapshots das partidas, o que simplifica a demonstracao do failover.
- Para alta disponibilidade real do controller, o proximo passo natural seria usar Redis/PostgreSQL para estado compartilhado e eleicao de lider.
- O jogo esta modelado em turnos alternados; erro conta para o jogador que tentou a letra.

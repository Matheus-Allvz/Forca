# Forca Distribuida

Projeto em Node.js para demonstrar uma arquitetura distribuida do jogo da forca com:

- `controller` centralizando fila, pareamento e descoberta dos servidores.
- `game-server` executando partidas independentes via socket.
- `web-client` servido pelo controller.
- `docker-compose` com um controller e dois servidores de jogo.
- configuracao centralizada via `.env`.
- failover de partida entre servidores com snapshot mantido no controller.

## Arquitetura

1. O cliente web conecta ao `controller` por socket.
2. O controller coloca o jogador na fila e informa a posicao de espera.
3. Quando existem dois jogadores disponiveis, o controller escolhe o servidor menos carregado.
4. O controller cria uma nova partida nesse servidor.
5. O `game-server` envia snapshots do estado da partida de volta ao controller.
6. Se um servidor parar de enviar heartbeat, o controller restaura a partida em outro servidor saudavel.
7. O cliente detecta a queda, consulta o controller e reconecta automaticamente ao novo servidor.

## Requisitos atendidos

- Cada partida possui exatamente 2 jogadores.
- Um terceiro jogador gera outra espera e depois outra partida, dando ideia de escalabilidade.
- Dois servidores de jogo sao iniciados em containers separados.
- Comunicacao cliente-servidor via socket.
- Reconexao em ate 30 segundos; apos isso, o adversario vence.
- Fila amigavel com feedback de posicao.
- Exibicao de letras corretas/erradas.
- Exibicao grafica da forca e do boneco no cliente.
- Monitoramento por `/health`, `/metrics` e `/monitor.html`.
- Failover de partida para outro servidor quando o servidor original cai.

## Configuracao com .env

O projeto usa um arquivo `.env` na raiz. Um exemplo completo esta em `.env.example`.

Principais grupos de variaveis:

- `HOST_IP`
- `CONTROLLER_PORT`, `PUBLIC_BASE_URL`, `CONTROLLER_INTERNAL_URL`
- `GAME_SERVER_PORT`, `GAME_SERVER_ID`, `GAME_SERVER_PUBLIC_URL`, `GAME_SERVER_INTERNAL_URL`, `CONTROLLER_URL`
- `GAME_SERVER_1_*` e `GAME_SERVER_2_*` para o `docker compose`

## Acesso de outros computadores

O IP atual da maquina host nesta rede e `10.42.27.21`.

Use estas URLs nos outros computadores da mesma rede:

- Lobby: `http://10.42.27.21:3000`
- Tela de jogo: `http://10.42.27.21:3000/game.html`
- Monitor do controller: `http://10.42.27.21:3000/monitor.html`

Se outro computador nao conseguir acessar, verifique:

1. Se ambos estao na mesma rede.
2. Se o firewall do Windows liberou as portas `3000`, `4001` e `4002`.
3. Se os containers foram recriados depois da mudanca do `.env`.

## Rodando localmente com Docker

```bash
docker compose up --build
```

Acesso local na propria maquina:

- Lobby: `http://localhost:3000`
- Tela de jogo: `http://localhost:3000/game.html`
- Monitor do controller: `http://localhost:3000/monitor.html`

Acesso remoto na rede:

- Lobby: `http://10.42.27.21:3000`
- Tela de jogo: `http://10.42.27.21:3000/game.html`
- Monitor do controller: `http://10.42.27.21:3000/monitor.html`

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
$env:PUBLIC_SERVER_URL="http://10.42.27.21:4002"
$env:INTERNAL_SERVER_URL="http://localhost:4002"
$env:CONTROLLER_URL="http://10.42.27.21:3000"
node game-server/server.js
```

## Fluxo para demonstracao

1. Abra dois navegadores ou abas anonimas e conecte dois jogadores.
2. Abra um terceiro navegador para mostrar que ele fica em espera por um quarto jogador.
3. Mostre o redirecionamento do lobby para `game.html` quando a partida comeca.
4. Durante uma partida, derrube um dos containers `game-server` e mostre a migracao da partida para o outro servidor.
5. Mostre o cliente reconectando automaticamente ao novo servidor.
6. Acesse `/monitor.html` para exibir observabilidade basica.

## Observacoes

- O controller mantem estado em memoria e snapshots das partidas, o que simplifica a demonstracao do failover.
- Para alta disponibilidade real do controller, o proximo passo natural seria usar Redis/PostgreSQL para estado compartilhado e eleicao de lider.
- O jogo esta modelado em turnos alternados; erro conta para o jogador que tentou a letra.

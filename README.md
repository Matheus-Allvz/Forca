# Forca Distribuida

Projeto em Node.js para demonstrar uma arquitetura distribuida do jogo da forca com:

- `controller` centralizando fila, pareamento e descoberta dos servidores.
- `game-server` executando partidas independentes via socket.
- `web-client` servido pelo controller.
- `docker-compose` com um controller e quatro servidores de jogo.
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
- Quatro servidores de jogo sao iniciados em containers separados.
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

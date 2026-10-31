# Planning Poker — Realtime Serverless (Host Source-of-Truth)

Sistema de **Planning Poker em tempo real** para estimativa ágil de tarefas (Scrum / Kanban) construído com **Vue 3**, **TypeScript**, **Tailwind CSS v4** e **Cloudflare Workers + Durable Objects (WebSocket Hibernation API)**.

O projeto opera **sem banco de dados tradicional**: o navegador do **Host** atua como a única fonte da verdade (*Source of Truth*) persistindo o estado bruto da sessão no `sessionStorage`, enquanto o Durable Object atua como um *relay* de baixíssima latência com snapshot efêmero em RAM.

---

## Arquitetura e Diferenciais Técnicos

1. **Padrão Stateless Relay + RAM Snapshot + WebSocket Hibernation:**
   - O Cloudflare Durable Object (`PokerRoom`) utiliza `this.ctx.acceptWebSocket(ws, [role, 'player:' + playerId])` e `setWebSocketAutoResponse` para responder a *heartbeats* (`PING`/`PONG`) diretamente na borda sem acordar o objeto da hibernação.
   - As ações dos jogadores (`CLIENT_ACTION`: entrar, votar, alternar modo espectador) são encaminhadas exclusivamente para o WebSocket do **Host**.
   - O navegador do Host processa a regra de negócio, salva o estado bruto (com votos abertos) no seu `sessionStorage`, aplica a função pura `maskRoomState()` caso `revealed === false` (garantindo que os valores dos votos nunca trafeguem na rede antes da revelação) e publica `HOST_BROADCAST`.
   - O Durable Object armazena apenas o último estado público mascarado em memória (`lastPublicState`) para entrega imediata a novos participantes que entrarem na sala e faz o broadcast (`STATE_SYNC`) para todos os clientes conectados.

2. **Resiliência a `F5` (Reload):**
   - Cada aba gera e persiste um `crypto.randomUUID()` no próprio `sessionStorage` (`pp_player_id`), evitando duplicação de assentos na mesa ao recarregar a página (e permitindo testar múltiplos jogadores em abas normais do mesmo navegador).
   - Se o Host recarregar a página (`F5`), ele reidrata automaticamente o estado bruto da sala a partir do `sessionStorage` local e reassume o controle da sala no Durable Object.

3. **Backlog de Tasks e Baralho Personalizável:**
   - **Fila de Tasks:** criação em lote no lobby ou adição individual durante a sessão, seleção de qual task está em votação, avanço automático para a próxima task pendente e cálculo automático da média/moda final por task e do total de pontos da sessão.
   - **Editor de Baralho em Tempo Real:** presets prontos (*Fibonacci*, *Scrum Modificado*, *T-Shirt Sizes*, *Potências de 2*) ou adição/remoção livre de cartas pelo Host a qualquer momento.

---

## Estrutura do Monorepo

```text
planning-poker/
├── shared/
│   └── types.ts                 # Contratos TypeScript (RoomState, Player, StoryTask, WS Messages e maskRoomState)
├── relay-worker/                # Backend Serverless (Cloudflare Worker + Durable Object)
│   ├── src/
│   │   ├── index.ts             # Roteador HTTP/CORS e upgrade WebSocket por roomId
│   │   └── PokerRoom.ts         # Durable Object (WebSocket Hibernation + RAM Snapshot)
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml            # Configuração com new_sqlite_classes (compatível com Plano Free)
└── web-app/                     # Frontend (Vue 3 Composition API / <script setup> + Vite + Tailwind CSS v4)
    ├── public/
    │   └── _redirects           # Regra SPA para Cloudflare Pages
    ├── src/
    │   ├── components/
    │   │   ├── atoms/           # BaseButton, BaseInput, BaseBadge, PlayingCard (Flip 3D), UserAvatar
    │   │   ├── molecules/       # PlayerSeat, StoryHeader, VoteSummaryCard, RoomShareBar
    │   │   ├── organisms/       # PokerTable, CardDeckDock, ResultsPanel, TaskListPanel, TopNavbar, JoinRoomModal
    │   │   └── templates/       # GameRoomTemplate, LobbyTemplate
    │   ├── pages/               # LobbyPage.vue, PokerRoomPage.vue
    │   ├── composables/         # usePokerRoom.ts (WS + sessionStorage), usePokerStats.ts
    │   ├── utils/               # storage.ts (Helpers de sessionStorage e UUID)
    │   └── router/              # index.ts (Vue Router)
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

---

## Pré-requisitos

- **Node.js** `>= 20.x` (recomendado `20 LTS` ou `22 LTS`)
- **npm** `>= 10.x`

---

## Como Rodar e Testar Localmente

Você precisará de **dois terminais** abertos simultaneamente (um para o Cloudflare Worker local e outro para o servidor de desenvolvimento Vite).

### 1. Instalar as dependências

No diretório do **Backend (`relay-worker`)**:
```bash
cd relay-worker
npm install
```

No diretório do **Frontend (`web-app`)**:
```bash
cd ../web-app
npm install
```

### 2. Iniciar o Backend (Terminal 1)

```bash
cd relay-worker
npm run dev
```
> O `wrangler dev` subirá o Worker e o Durable Object localmente em `http://localhost:8787` (WebSocket em `ws://localhost:8787/ws/:roomId`).

### 3. Iniciar o Frontend (Terminal 2)

```bash
cd web-app
npm run dev
```
> O Vite subirá a aplicação Vue 3 em `http://localhost:5173`.

---

## Roteiro para Testar o Fluxo Multi-Jogador

Como toda a identidade e estado são salvos no `sessionStorage` (que é isolado por aba do navegador), você pode simular vários jogadores abrindo **abas normais lado a lado**:

1. **Aba 1 (Host):**
   - Acesse `http://localhost:5173`.
   - Em **Criar Sala como Host**, informe seu nome, escolha o baralho de cartas, defina a lista inicial de tasks (uma por linha) e clique em **Criar Sala Agora**.
   - No topo da sala, clique no botão **Convidar** para copiar o link da sala (`http://localhost:5173/room/XXXXXX`).

2. **Aba 2 e Aba 3 (Jogadores):**
   - Abra novas abas e cole o link da sala.
   - Informe o nome de cada participante no modal e clique em **Entrar na Mesa**.

3. **Testando Votação, Sigilo e Revelação:**
   - Selecione cartas diferentes em cada aba.
   - Observe que na mesa as cartas aparecem viradas para baixo (`hasVoted: true`, `vote: null` no tráfego de rede).
   - Recarregue (`F5`) a aba de um jogador ou a própria aba do Host e verifique que o estado e os assentos permanecem intactos.
   - Na **Aba 1 (Host)**, clique em **Revelar Cartas** no centro da mesa para acionar o flip 3D simultâneo, calcular a **Média**, **Mediana**, **Distribuição** e gravar a estimativa final na task ativa.
   - Clique em **Próxima Task →** para avançar automaticamente na fila do backlog.

---

## Checagem de Tipos e Build de Produção

Para validar o TypeScript em ambos os pacotes:

```bash
# Backend
cd relay-worker && npm run typecheck

# Frontend
cd ../web-app && npm run typecheck
```

Para gerar o bundle otimizado do Frontend:

```bash
cd web-app
npm run build
```

---

## Deploy na Cloudflare (Workers + Pages — Plano Free)

### 1. Autenticar na Cloudflare
```bash
cd relay-worker
npx wrangler login
```

### 2. Deploy do Backend (`relay-worker`)
```bash
cd relay-worker
npm run deploy
```
Anote a URL gerada (ex: `https://planning-poker-relay.<seu-subdominio>.workers.dev`).

### 3. Build e Deploy do Frontend (`web-app`) no Cloudflare Pages
```bash
cd ../web-app
VITE_WS_URL=wss://planning-poker-relay.<seu-subdominio>.workers.dev npm run build

npx wrangler pages project create planning-poker-web --production-branch main
npx wrangler pages deploy dist --project-name planning-poker-web
```

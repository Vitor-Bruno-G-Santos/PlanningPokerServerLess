import { DurableObject } from 'cloudflare:workers';
import type {
  ClientToRelayMessage,
  RelayToClientMessage,
  Role,
  RoomState,
} from '../../shared/types';

export interface Env {
  POKER_ROOM: DurableObjectNamespace<PokerRoom>;
}

interface ConnectionAttachment {
  playerId: string;
  role: Role;
}

export class PokerRoom extends DurableObject<Env> {
  /**
   * Cache efemero em RAM do ultimo estado publico mascarado enviado pelo Host.
   * Permite entrega imediata a novos jogadores que entram na sala.
   */
  private lastPublicState: RoomState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Resposta automatica em nivel de edge para PING textual se necessario,
    // sem acordar o Durable Object da hibernacao.
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(
        JSON.stringify({ type: 'PING' }),
        JSON.stringify({ type: 'PONG' })
      )
    );
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const url = new URL(request.url);
    const roleParam = url.searchParams.get('role');
    const role: Role = roleParam === 'host' ? 'host' : 'player';
    const playerId = url.searchParams.get('playerId') || crypto.randomUUID();

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Tags permitem filtrar conexoes via this.ctx.getWebSockets('host') mesmo apos hibernacao
    this.ctx.acceptWebSocket(server, [role, `player:${playerId}`]);

    const attachment: ConnectionAttachment = { playerId, role };
    server.serializeAttachment(attachment);

    if (role === 'host') {
      // Notifica todos os jogadores que o Host conectou/reconectou (ex: apos F5)
      this.broadcast({ type: 'HOST_RECONNECTED' }, server);
    } else if (this.lastPublicState) {
      // Entrega imediatamente o snapshot em RAM para o novo jogador
      this.sendToSocket(server, {
        type: 'STATE_SYNC',
        state: this.lastPublicState,
      });
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    if (typeof message !== 'string') {
      return;
    }

    let parsed: ClientToRelayMessage;
    try {
      parsed = JSON.parse(message) as ClientToRelayMessage;
    } catch {
      this.sendToSocket(ws, {
        type: 'ERROR',
        message: 'Invalid JSON payload',
      });
      return;
    }

    if (parsed.type === 'PING') {
      this.sendToSocket(ws, { type: 'PONG' });
      return;
    }

    const attachment = ws.deserializeAttachment() as ConnectionAttachment | null;
    const isHost =
      attachment?.role === 'host' || this.ctx.getTags(ws).includes('host');

    if (parsed.type === 'HOST_BROADCAST') {
      if (!isHost) {
        this.sendToSocket(ws, {
          type: 'ERROR',
          message: 'Apenas o Host pode publicar HOST_BROADCAST.',
        });
        return;
      }

      this.lastPublicState = parsed.state;
      this.broadcast({
        type: 'STATE_SYNC',
        state: parsed.state,
      });
      return;
    }

    if (parsed.type === 'CLIENT_ACTION') {
      const hostSockets = this.ctx.getWebSockets('host');
      if (hostSockets.length === 0) {
        this.sendToSocket(ws, {
          type: 'ERROR',
          message: 'Host desconectado no momento. Aguardando reconexao...',
        });
        return;
      }

      const forwardMsg: RelayToClientMessage = {
        type: 'CLIENT_ACTION',
        payload: parsed.payload,
      };

      for (const hostWs of hostSockets) {
        this.sendToSocket(hostWs, forwardMsg);
      }
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean
  ): Promise<void> {
    const attachment = ws.deserializeAttachment() as ConnectionAttachment | null;
    try {
      ws.close(code, reason || 'Client closed connection');
    } catch {
      // Ignora erro caso o socket ja esteja fechado
    }

    if (!attachment) {
      return;
    }

    if (attachment.role === 'host') {
      // Verifica se ainda resta algum outro socket de host ativo (ex: reconexao concorrente no F5)
      const remainingHosts = this.ctx
        .getWebSockets('host')
        .filter((s) => s !== ws);
      if (remainingHosts.length === 0) {
        this.broadcast({ type: 'HOST_DISCONNECTED' });
      }
      return;
    }

    // Se um jogador fechou a aba/desconectou, avisa o Host para atualizar presenca
    const remainingForPlayer = this.ctx
      .getWebSockets(`player:${attachment.playerId}`)
      .filter((s) => s !== ws);

    if (remainingForPlayer.length === 0) {
      const hostSockets = this.ctx.getWebSockets('host');
      for (const hostWs of hostSockets) {
        this.sendToSocket(hostWs, {
          type: 'PLAYER_DISCONNECTED',
          playerId: attachment.playerId,
        });
      }
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    await this.webSocketClose(ws, 1011, 'WebSocket internal error', false);
  }

  private sendToSocket(ws: WebSocket, msg: RelayToClientMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Socket desconectado
    }
  }

  private broadcast(msg: RelayToClientMessage, excludeSocket?: WebSocket): void {
    const payload = JSON.stringify(msg);
    for (const sock of this.ctx.getWebSockets()) {
      if (excludeSocket && sock === excludeSocket) {
        continue;
      }
      try {
        sock.send(payload);
      } catch {
        // Ignora sockets mortos
      }
    }
  }
}

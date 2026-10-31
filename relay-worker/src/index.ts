import { PokerRoom, type Env } from './PokerRoom';

export { PokerRoom };

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json(
        { status: 'ok', service: 'planning-poker-relay' },
        { headers: CORS_HEADERS }
      );
    }

    // Rota WebSocket: /ws/:roomId?role=host|player&playerId=<uuid>
    const match = url.pathname.match(/^\/ws\/([a-zA-Z0-9_-]+)$/);
    if (!match) {
      return Response.json(
        {
          error: 'Not Found. Connect via WebSocket to /ws/:roomId?role=host|player&playerId=UUID',
        },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const roomId = match[1].toUpperCase();
    const id = env.POKER_ROOM.idFromName(roomId);
    const stub = env.POKER_ROOM.get(id);

    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;

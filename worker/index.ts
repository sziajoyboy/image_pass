import { createMcpHandler } from 'agents/mcp/server';
import { createImagePassServer } from '../src/server.js';

const mcp = createMcpHandler(createImagePassServer);

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'image-pass',
        version: '0.1.0',
        runtime: 'cloudflare-workers',
      });
    }

    if (url.pathname !== '/mcp') {
      return new Response('Not found', { status: 404 });
    }

    return mcp(request, env as never, ctx as never);
  },
};

import { createServer, IncomingMessage } from 'node:http';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createImagePassServer } from './server.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const mcpPath = process.env.IMAGE_PASS_MCP_PATH ?? '/mcp';
const bearerToken = process.env.IMAGE_PASS_BEARER_TOKEN;
const publicHost =
  process.env.IMAGE_PASS_PUBLIC_HOST ??
  process.env.RENDER_EXTERNAL_HOSTNAME ??
  null;

const allowedOrigins = new Set(
  (
    process.env.IMAGE_PASS_ALLOWED_ORIGINS ??
    'https://chatgpt.com,https://chat.openai.com'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.IMAGE_PASS_RATE_LIMIT ?? 120);
const MAX_BODY_BYTES = Number(process.env.IMAGE_PASS_MAX_BODY_BYTES ?? 1_000_000);
const MAX_RATE_KEYS = 10_000;

const requestWindows = new Map<string, { startedAt: number; count: number }>();
let lastCleanupAt = Date.now();

function cleanupRateWindows(now: number) {
  if (now - lastCleanupAt < WINDOW_MS) return;
  lastCleanupAt = now;

  for (const [key, value] of requestWindows) {
    if (now - value.startedAt >= WINDOW_MS * 2) requestWindows.delete(key);
  }

  if (requestWindows.size > MAX_RATE_KEYS) {
    const oldest = [...requestWindows.entries()]
      .sort((a, b) => a[1].startedAt - b[1].startedAt)
      .slice(0, requestWindows.size - MAX_RATE_KEYS);
    for (const [key] of oldest) requestWindows.delete(key);
  }
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  cleanupRateWindows(now);
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

function clientKey(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.split(',')[0]?.trim()
        : undefined;
  return firstForwarded || req.socket.remoteAddress || 'unknown';
}

function bodyTooLarge(req: IncomingMessage): boolean {
  const raw = req.headers['content-length'];
  if (!raw) return false;
  const size = Number(raw);
  return Number.isFinite(size) && size > MAX_BODY_BYTES;
}

function authorized(header: string | undefined): boolean {
  if (!bearerToken) return true;
  return header === `Bearer ${bearerToken}`;
}

function validHost(header: string | undefined): boolean {
  if (!publicHost) return true;
  const incoming = header?.split(':')[0]?.toLowerCase();
  return incoming === publicHost.toLowerCase();
}

function validOrigin(header: string | undefined): boolean {
  if (!header) return true;
  return allowedOrigins.has(header);
}

const handler = createMcpHandler(createImagePassServer);
const nodeHandler = toNodeHandler(handler);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/health') {
    res
      .writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      .end(JSON.stringify({ ok: true, service: 'image-pass', version: '0.1.0' }));
    return;
  }

  if (url.pathname !== mcpPath) {
    res.writeHead(404).end();
    return;
  }

  if (!validHost(req.headers.host)) {
    res.writeHead(403).end('Invalid host');
    return;
  }

  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (!validOrigin(origin)) {
    res.writeHead(403).end('Invalid origin');
    return;
  }

  const auth =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : undefined;
  if (!authorized(auth)) {
    res
      .writeHead(401, {
        'content-type': 'application/json; charset=utf-8',
        'www-authenticate': 'Bearer',
      })
      .end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  if (bodyTooLarge(req)) {
    res
      .writeHead(413, { 'content-type': 'application/json; charset=utf-8' })
      .end(JSON.stringify({ error: 'payload_too_large' }));
    return;
  }

  if (rateLimited(clientKey(req))) {
    res
      .writeHead(429, {
        'content-type': 'application/json; charset=utf-8',
        'retry-after': '60',
      })
      .end(JSON.stringify({ error: 'rate_limited' }));
    return;
  }

  void nodeHandler(req, res);
});

server.listen(port, host, () => {
  console.error(`image-pass listening on http://${host}:${port}${mcpPath} (health: /health)`);
  if (!bearerToken) {
    console.error('warning: IMAGE_PASS_BEARER_TOKEN is not set; MCP endpoint is unauthenticated');
  }
});

async function shutdown() {
  await handler.close();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createImagePassServer } from './server.js';

void serveStdio(createImagePassServer);
console.error('image-pass MCP server running on stdio');

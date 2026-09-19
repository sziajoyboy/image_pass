import { McpServer } from '@modelcontextprotocol/server';
import { buildImagePassProtocol } from './protocol.js';
import { ImagePassOutputSchema, ToolInputSchema } from './schemas.js';

export function createImagePassServer() {
  const server = new McpServer(
    {
      name: 'image-pass',
      version: '0.1.0',
    },
    {
      instructions:
        'Image Pass is API-free. The host ChatGPT sees the image, chooses the route, and uses its own native image generation/editing tool. Use preflight to decide whether a formal visual workflow is worthwhile and to lock the brief and references. After a current image exists, use review: apply the Visual Improvement Gate and route only when a concrete material visual problem exists. Choose up to three passes from brief, composition, reference, fidelity, and artifact. Prefer targeted edits for local problems; regenerate only when the underlying global structure is wrong or a targeted edit cannot safely solve it. Preserve already-correct locked elements with the Visual Preservation Guard. Never call another model and never expose private chain-of-thought.',
    },
  );

  server.registerTool(
    'image_pass',
    {
      title: 'Image Pass',
      description:
        'Return an API-free visual workflow protocol for host-native image generation or editing. It supports brief/reference locks, a visual improvement gate, 0–3 image passes, targeted-edit-first routing, preservation of already-correct visual decisions, and a one-extra-pass stop rule.',
      inputSchema: ToolInputSchema,
      outputSchema: ImagePassOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const output = buildImagePassProtocol(input);
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: 'text', text: `Image Pass failed: ${message}` }],
        };
      }
    },
  );

  return server;
}

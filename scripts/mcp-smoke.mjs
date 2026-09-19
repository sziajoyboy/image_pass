import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';

const url = new URL(
  process.env.IMAGE_PASS_SMOKE_URL ?? 'http://127.0.0.1:3000/mcp',
);

const client = new Client(
  { name: 'image-pass-ci-smoke', version: '0.1.0' },
  { versionNegotiation: { mode: 'auto' } },
);

await client.connect(new StreamableHTTPClientTransport(url));

const protocolEra = client.getProtocolEra();
if (protocolEra !== 'modern') {
  throw new Error(`Expected modern MCP era, got: ${String(protocolEra)}`);
}

const { tools } = await client.listTools();
const imagePassTool = tools.find((tool) => tool.name === 'image_pass');
if (!imagePassTool) throw new Error('image_pass tool was not discovered');

const schemaProperties = imagePassTool.inputSchema?.properties ?? {};
for (const field of [
  'phase',
  'briefLock',
  'referenceLock',
  'improvementGatePassed',
  'improvementTarget',
  'editStrategy',
]) {
  if (!(field in schemaProperties)) {
    throw new Error(`tool discovery did not expose ${field}`);
  }
}

const instructions = client.getInstructions();
for (const phrase of [
  'Visual Improvement Gate',
  'targeted edits',
  'Visual Preservation Guard',
  'native image generation/editing tool',
]) {
  if (!instructions?.includes(phrase)) {
    throw new Error(`server instructions are missing: ${phrase}`);
  }
}

const preflight = await client.callTool({
  name: 'image_pass',
  arguments: {
    task: 'Create a reference-driven character card.',
    phase: 'preflight',
    visualValueGatePassed: true,
    briefLock: {
      mustHave: ['central character'],
      mustNotChange: ['orange frame'],
      mayChange: ['minor texture'],
      avoid: ['generic glossy 3D'],
    },
    referenceLock: {
      primaryReference: 'uploaded card reference',
      references: [
        {
          reference: 'uploaded card reference',
          role: 'primary',
          lockedTraits: ['panel structure', 'typographic hierarchy'],
        },
      ],
      forbiddenDrift: ['do not replace the manga-panel rhythm'],
    },
    passes: [],
  },
});

if (preflight.structuredContent?.version !== '0.1.0') {
  throw new Error('unexpected Image Pass protocol version');
}
if (preflight.structuredContent?.workflowActive !== true) {
  throw new Error('preflight workflow did not activate');
}

const review = await client.callTool({
  name: 'image_pass',
  arguments: {
    task: 'Fix the current card without changing the frame.',
    phase: 'review',
    visualValueGatePassed: true,
    improvementGatePassed: true,
    improvementTarget: 'The face drifted while the frame is already correct.',
    reviewFindings: [
      {
        issue: 'face drift',
        scope: 'local',
        area: 'central portrait',
        material: true,
      },
    ],
    passes: ['reference', 'fidelity'],
    changeScope: 'local',
    editStrategy: 'targeted_edit',
  },
});

if (review.structuredContent?.selectedEditStrategy !== 'targeted_edit') {
  throw new Error('targeted edit strategy was not preserved');
}
if (
  JSON.stringify(review.structuredContent?.selectedPasses) !==
  JSON.stringify(['reference', 'fidelity'])
) {
  throw new Error('unexpected selected passes');
}
if (!review.structuredContent?.preservationGuardRule?.includes('already-correct')) {
  throw new Error('Preservation Guard rule is missing');
}
if (!review.structuredContent?.stopRule?.includes('at most one additional targeted pass')) {
  throw new Error('one-extra-pass stop rule is missing');
}

const stop = await client.callTool({
  name: 'image_pass',
  arguments: {
    task: 'Review the corrected result.',
    phase: 'review',
    visualValueGatePassed: true,
    improvementGatePassed: false,
    passes: [],
  },
});

if (stop.structuredContent?.zeroPass !== true) {
  throw new Error('visual zero-pass stop is not working');
}

console.log(
  JSON.stringify({
    ok: true,
    protocolEra,
    tools: tools.map((tool) => tool.name),
    version: review.structuredContent?.version,
    apiFree: true,
    preflight: preflight.structuredContent?.visualValueGate,
    review: review.structuredContent?.visualImprovementGate,
    passes: review.structuredContent?.selectedPasses,
    strategy: review.structuredContent?.selectedEditStrategy,
    zeroPassStop: stop.structuredContent?.zeroPass,
  }),
);

await client.close();

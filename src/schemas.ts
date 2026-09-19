import { z } from 'zod';

export const ImagePassNameSchema = z.enum([
  'brief',
  'composition',
  'reference',
  'fidelity',
  'artifact',
]);
export type ImagePassName = z.infer<typeof ImagePassNameSchema>;

export const PhaseSchema = z.enum(['preflight', 'review']);
export type Phase = z.infer<typeof PhaseSchema>;

export const ChangeScopeSchema = z.enum(['local', 'global', 'mixed']);
export type ChangeScope = z.infer<typeof ChangeScopeSchema>;

export const EditStrategySchema = z.enum(['targeted_edit', 'regenerate']);
export type EditStrategy = z.infer<typeof EditStrategySchema>;

export const ReferenceRoleSchema = z.enum([
  'primary',
  'style',
  'composition',
  'typography',
  'palette',
  'subject',
  'texture',
  'other',
]);

const StringListSchema = z.array(z.string().min(1).max(500)).max(24).default([]);

export const BriefLockSchema = z.object({
  mustHave: StringListSchema,
  mustNotChange: StringListSchema,
  mayChange: StringListSchema,
  avoid: StringListSchema,
});
export type BriefLock = z.infer<typeof BriefLockSchema>;

export const ReferenceItemSchema = z.object({
  reference: z.string().min(1).max(2_000),
  role: ReferenceRoleSchema,
  lockedTraits: StringListSchema,
});

export const ReferenceLockSchema = z.object({
  primaryReference: z.string().min(1).max(2_000).optional(),
  references: z.array(ReferenceItemSchema).max(12).default([]),
  forbiddenDrift: StringListSchema,
});
export type ReferenceLock = z.infer<typeof ReferenceLockSchema>;

export const ReviewFindingSchema = z.object({
  issue: z.string().min(1).max(2_000),
  scope: ChangeScopeSchema,
  area: z.string().min(1).max(500).optional(),
  material: z.boolean().default(true),
});
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

export const ToolInputSchema = z.object({
  task: z
    .string()
    .min(1)
    .max(20_000)
    .describe('The image-generation or image-editing task.'),
  context: z
    .string()
    .max(40_000)
    .optional()
    .describe('Relevant conversation context, constraints, or visual decisions.'),
  phase: PhaseSchema.default('review').describe(
    'Use preflight before the first generation/edit to lock the brief and references. Use review after a current image exists.',
  ),
  visualValueGatePassed: z
    .boolean()
    .optional()
    .describe(
      'Whether a formal Image Pass workflow is expected to materially improve this task over one normal host image-tool call. False means skip the formal workflow.',
    ),
  briefLock: BriefLockSchema.optional().describe(
    'Explicit visual requirements to preserve across iterations.',
  ),
  referenceLock: ReferenceLockSchema.optional().describe(
    'Textual contract for reference images. The MCP does not inspect images; the host model sees them and supplies the lock.',
  ),
  improvementGatePassed: z
    .boolean()
    .optional()
    .describe(
      'Review phase only. True only when a concrete visual problem or lock violation has been identified.',
    ),
  improvementTarget: z
    .string()
    .max(4_000)
    .optional()
    .describe(
      'Concise concrete visual issue to fix. Do not use vague goals such as make it better or try another version.',
    ),
  reviewFindings: z
    .array(ReviewFindingSchema)
    .max(12)
    .default([])
    .describe('Material visual findings from the host model review.'),
  passes: z
    .array(ImagePassNameSchema)
    .max(3)
    .default([])
    .describe(
      'Review phase only. Select zero to three high-value visual passes. Zero is correct when the improvement gate stops.',
    ),
  changeScope: ChangeScopeSchema.optional().describe(
    'Review phase only. Overall scope of the concrete issue: local, global, or mixed.',
  ),
  editStrategy: EditStrategySchema.optional().describe(
    'Review phase only. Host-selected action. Prefer targeted_edit when the problem can be isolated; use regenerate only when the underlying global structure is wrong or a targeted edit cannot safely fix it.',
  ),
});
export type ToolInput = z.infer<typeof ToolInputSchema>;

export const ImagePassProtocolSchema = z.object({
  pass: ImagePassNameSchema,
  objective: z.string(),
  instructions: z.array(z.string()).min(1).max(8),
  successSignal: z.string(),
});
export type ImagePassProtocol = z.infer<typeof ImagePassProtocolSchema>;

export const VisualValueGateOutputSchema = z.object({
  question: z.string(),
  passed: z.boolean(),
  decision: z.enum(['skip_workflow', 'use_workflow']),
  rule: z.string(),
});

export const VisualImprovementGateOutputSchema = z.object({
  question: z.string(),
  applies: z.boolean(),
  passed: z.boolean().nullable(),
  decision: z.enum(['not_applicable', 'stop', 'route']),
  target: z.string().nullable(),
  rule: z.string(),
});

export const ImagePassOutputSchema = z.object({
  version: z.literal('0.1.0'),
  phase: PhaseSchema,
  workflowActive: z.boolean(),
  visualValueGate: VisualValueGateOutputSchema,
  visualImprovementGate: VisualImprovementGateOutputSchema,
  zeroPass: z.boolean(),
  briefLock: BriefLockSchema.nullable(),
  referenceLock: ReferenceLockSchema.nullable(),
  selectedPasses: z.array(ImagePassNameSchema).max(3),
  protocol: z.array(ImagePassProtocolSchema).max(3),
  reviewFindings: z.array(ReviewFindingSchema).max(12),
  changeScope: ChangeScopeSchema.nullable(),
  selectedEditStrategy: EditStrategySchema.nullable(),
  referencePriorityRule: z.string(),
  editStrategyRule: z.string(),
  preservationGuardRule: z.string(),
  stopRule: z.string(),
  finalizationRule: z.string(),
});
export type ImagePassOutput = z.infer<typeof ImagePassOutputSchema>;

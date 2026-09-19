import { describe, expect, it } from 'vitest';
import {
  buildImagePassProtocol,
  EDIT_STRATEGY_RULE,
  PRESERVATION_GUARD_RULE,
  REFERENCE_PRIORITY_RULE,
  STOP_RULE,
  VISUAL_IMPROVEMENT_GATE_QUESTION,
  VISUAL_VALUE_GATE_QUESTION,
} from '../src/protocol.js';
import { ToolInputSchema } from '../src/schemas.js';

describe('Image Pass v0.1.0 visual gates, locks, routing, and preservation', () => {
  it('skips the formal workflow when the Visual Value Gate fails', () => {
    const input = ToolInputSchema.parse({
      task: 'Generate a simple blue circle.',
      phase: 'preflight',
      visualValueGatePassed: false,
      passes: [],
    });

    const result = buildImagePassProtocol(input);

    expect(result.version).toBe('0.1.0');
    expect(result.visualValueGate.question).toBe(VISUAL_VALUE_GATE_QUESTION);
    expect(result.visualValueGate.decision).toBe('skip_workflow');
    expect(result.workflowActive).toBe(false);
    expect(result.zeroPass).toBe(true);
    expect(result.selectedPasses).toEqual([]);
  });

  it('supports preflight with brief and reference locks but no review passes', () => {
    const input = ToolInputSchema.parse({
      task: 'Create a character card from the supplied reference.',
      phase: 'preflight',
      visualValueGatePassed: true,
      briefLock: {
        mustHave: ['central character', 'ticket-like frame'],
        mustNotChange: ['orange palette'],
        mayChange: ['small decorative details'],
        avoid: ['generic glossy 3D look'],
      },
      referenceLock: {
        primaryReference: 'uploaded Etsy card reference',
        references: [
          {
            reference: 'uploaded Etsy card reference',
            role: 'primary',
            lockedTraits: ['panel structure', 'typographic hierarchy'],
          },
        ],
        forbiddenDrift: ['do not turn it into a modern app card'],
      },
      passes: [],
    });

    const result = buildImagePassProtocol(input);

    expect(result.workflowActive).toBe(true);
    expect(result.visualImprovementGate.applies).toBe(false);
    expect(result.referenceLock?.primaryReference).toContain('Etsy');
    expect(result.protocol).toEqual([]);
    expect(result.referencePriorityRule).toBe(REFERENCE_PRIORITY_RULE);
    expect(result.finalizationRule).toContain('one host-native generation or edit');
  });

  it('stops after review when no concrete material issue exists', () => {
    const input = ToolInputSchema.parse({
      task: 'Review the generated card.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: false,
      passes: [],
    });

    const result = buildImagePassProtocol(input);

    expect(result.visualImprovementGate.question).toBe(
      VISUAL_IMPROVEMENT_GATE_QUESTION,
    );
    expect(result.visualImprovementGate.decision).toBe('stop');
    expect(result.zeroPass).toBe(true);
    expect(result.finalizationRule).toContain('Keep the current image');
  });

  it('routes a local issue to a targeted edit with selected passes', () => {
    const input = ToolInputSchema.parse({
      task: 'Fix the current card without changing the accepted frame.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      improvementTarget:
        'The character face drifted from the accepted target while the frame and layout are already correct.',
      reviewFindings: [
        {
          issue: 'Character face drift',
          scope: 'local',
          area: 'central portrait',
          material: true,
        },
      ],
      passes: ['reference', 'fidelity'],
      changeScope: 'local',
      editStrategy: 'targeted_edit',
    });

    const result = buildImagePassProtocol(input);

    expect(result.visualImprovementGate.decision).toBe('route');
    expect(result.selectedPasses).toEqual(['reference', 'fidelity']);
    expect(result.selectedEditStrategy).toBe('targeted_edit');
    expect(result.editStrategyRule).toBe(EDIT_STRATEGY_RULE);
    expect(result.preservationGuardRule).toBe(PRESERVATION_GUARD_RULE);
  });

  it('allows regeneration for a global composition failure', () => {
    const input = ToolInputSchema.parse({
      task: 'Fix the image architecture.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      improvementTarget:
        'The entire composition uses the wrong camera and hierarchy, so local edits would not solve the structure.',
      reviewFindings: [
        {
          issue: 'Global camera and hierarchy mismatch',
          scope: 'global',
          material: true,
        },
      ],
      passes: ['composition', 'reference'],
      changeScope: 'global',
      editStrategy: 'regenerate',
    });

    const result = buildImagePassProtocol(input);

    expect(result.selectedEditStrategy).toBe('regenerate');
    expect(result.changeScope).toBe('global');
    expect(result.editStrategyRule).toContain('restat');
  });

  it('requires a concrete improvement target when the gate passes', () => {
    const input = ToolInputSchema.parse({
      task: 'Make it better.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      passes: ['composition'],
      editStrategy: 'targeted_edit',
    });

    expect(() => buildImagePassProtocol(input)).toThrow(
      'Visual Improvement Gate passed, so provide a concrete improvementTarget',
    );
  });

  it('requires an edit strategy for a routed review', () => {
    const input = ToolInputSchema.parse({
      task: 'Fix the artifact.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      improvementTarget: 'There is a visible masking seam around the hand.',
      passes: ['artifact'],
    });

    expect(() => buildImagePassProtocol(input)).toThrow(
      'A routed review requires an editStrategy',
    );
  });

  it('rejects review fields during preflight', () => {
    const input = ToolInputSchema.parse({
      task: 'Prepare this image task.',
      phase: 'preflight',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      improvementTarget: 'Wrong crop',
      passes: ['composition'],
      editStrategy: 'targeted_edit',
    });

    expect(() => buildImagePassProtocol(input)).toThrow(
      'Preflight only establishes the Visual Value Gate and locks',
    );
  });

  it('rejects more than three selected passes', () => {
    const result = ToolInputSchema.safeParse({
      task: 'Review this image deeply.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      improvementTarget: 'Several material issues remain.',
      passes: ['brief', 'composition', 'reference', 'fidelity'],
      editStrategy: 'regenerate',
    });

    expect(result.success).toBe(false);
  });

  it('deduplicates repeated passes', () => {
    const input = ToolInputSchema.parse({
      task: 'Fix only the artifact.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      improvementTarget: 'A duplicated finger remains.',
      passes: ['artifact', 'artifact'],
      editStrategy: 'targeted_edit',
    });

    const result = buildImagePassProtocol(input);

    expect(result.selectedPasses).toEqual(['artifact']);
    expect(result.protocol).toHaveLength(1);
  });

  it('keeps reference and fidelity distinct', () => {
    const input = ToolInputSchema.parse({
      task: 'Fix reference drift without losing accepted design traits.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      improvementTarget:
        'The panel structure drifted from the primary reference while the accepted character palette must stay unchanged.',
      passes: ['reference', 'fidelity'],
      editStrategy: 'targeted_edit',
    });

    const result = buildImagePassProtocol(input);
    const reference = result.protocol.find((item) => item.pass === 'reference');
    const fidelity = result.protocol.find((item) => item.pass === 'fidelity');

    expect(reference?.objective).toContain('reference');
    expect(reference?.instructions.join(' ')).toContain('role assigned');
    expect(fidelity?.objective).toContain('Preserve already-correct');
    expect(fidelity?.instructions.join(' ')).toContain('current accepted target image');
  });

  it('preserves the one-extra-targeted-pass stop rule', () => {
    const input = ToolInputSchema.parse({
      task: 'Fix the crop.',
      phase: 'review',
      visualValueGatePassed: true,
      improvementGatePassed: true,
      improvementTarget: 'The crop cuts off the title.',
      passes: ['composition'],
      editStrategy: 'targeted_edit',
    });

    const result = buildImagePassProtocol(input);

    expect(result.stopRule).toBe(STOP_RULE);
    expect(result.stopRule).toContain('at most one additional targeted pass');
    expect(result.stopRule).toContain('Do not regenerate merely');
  });
});

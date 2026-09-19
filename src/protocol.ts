import {
  ImagePassName,
  ImagePassOutput,
  ImagePassOutputSchema,
  ImagePassProtocol,
  ToolInput,
} from './schemas.js';

export const VISUAL_VALUE_GATE_QUESTION =
  'Would a formal visual lock-and-review workflow materially improve this image task over one normal host image-tool call?';

export const VISUAL_IMPROVEMENT_GATE_QUESTION =
  'Is there a concrete visual mismatch, artifact, or lock violation whose correction is expected to materially improve the current image?';

export const REFERENCE_PRIORITY_RULE =
  'Resolve visual conflicts in this order: explicit user brief first; preservation requirements from the current target image second; primary reference third; role-specific secondary references fourth; model taste last. Never let a lower-priority reference silently override a higher-priority lock.';

export const EDIT_STRATEGY_RULE =
  'Prefer targeted_edit when the problem is local or can be isolated without disturbing already-correct elements. Use regenerate only when the underlying composition, camera, pose, layout, style system, or other global structure is wrong, or when a targeted edit cannot safely solve the problem. When regenerating, restate every active lock.';

export const PRESERVATION_GUARD_RULE =
  'Before any edit or regeneration, identify already-correct locked elements that could regress. After the image-tool call, compare those elements again. Do not trade a local improvement for damage to previously accepted composition, subject identity, typography, palette, layout, reference fidelity, or other locked traits unless the improvement target specifically requires that change.';

export const STOP_RULE =
  'After the selected passes and resulting host image-tool call, ask whether a specific remaining visual problem or lock violation would materially improve brief compliance or image quality if fixed. If no, stop. If yes, run at most one additional targeted pass focused only on that problem. Do not regenerate merely to get another variation.';

const PASS_PROTOCOLS: Record<ImagePassName, ImagePassProtocol> = {
  brief: {
    pass: 'brief',
    objective:
      'Check the current image against the explicit user brief and locked task requirements.',
    instructions: [
      'Check only requirements that materially affect whether the image satisfies the task.',
      'Compare the image against mustHave, mustNotChange, mayChange, and avoid locks when present.',
      'Identify concrete omissions, substitutions, or violations rather than vague aesthetic dissatisfaction.',
      'Do not invent new requirements after generation merely because another version is possible.',
      'Keep already-satisfied brief requirements locked during the next edit.',
    ],
    successSignal:
      'Every material brief requirement is either satisfied or represented by one concrete correction target.',
  },
  composition: {
    pass: 'composition',
    objective:
      'Evaluate framing, hierarchy, camera, crop, spacing, scale, negative space, and the spatial relationship of important elements.',
    instructions: [
      'Check whether the intended focal point is visually dominant.',
      'Check crop, camera angle, perspective, object scale, balance, spacing, and negative space only where they affect the intended result.',
      'Distinguish a local placement problem from a global composition failure.',
      'Prefer a targeted edit for isolated layout issues when the surrounding composition is already correct.',
      'Do not redesign the whole image to fix a small positional problem.',
    ],
    successSignal:
      'The composition supports the intended hierarchy without introducing unnecessary structural change.',
  },
  reference: {
    pass: 'reference',
    objective:
      'Check whether the image preserves the specific visual properties assigned to each reference without blending references indiscriminately.',
    instructions: [
      'Use the primary reference as the strongest external visual anchor unless the explicit user brief conflicts with it.',
      'For each secondary reference, evaluate only the role assigned to it, such as composition, typography, palette, subject, texture, or style.',
      'Identify concrete reference drift rather than asking whether the image generally feels similar.',
      'Do not copy unrelated traits from a reference simply because they are visible.',
      'Protect higher-priority locks when correcting a lower-priority reference mismatch.',
    ],
    successSignal:
      'The intended traits of each relevant reference are present without unrequested cross-reference drift.',
  },
  fidelity: {
    pass: 'fidelity',
    objective:
      'Preserve already-correct subject, character, object, identity, typography, layout, or design traits across iterations.',
    instructions: [
      'Compare the new result to the current accepted target image, not only to the original prompt.',
      'Identify what was already correct before the requested change and should remain unchanged.',
      'Check for identity drift, pose drift, costume drift, logo drift, type drift, frame drift, palette drift, or other unintended change relevant to the task.',
      'Treat preservation failures as regressions even when the edited area improved.',
      'Prefer the smallest edit that fixes the target without disturbing accepted traits.',
    ],
    successSignal:
      'The requested change is achieved while already-correct locked traits remain intact.',
  },
  artifact: {
    pass: 'artifact',
    objective:
      'Detect concrete generation or editing defects that reduce image quality or usability.',
    instructions: [
      'Check anatomy, geometry, duplicated elements, broken edges, warped objects, masking seams, inconsistent lighting, corrupted text, and other visible synthesis defects relevant to the image.',
      'Ignore tiny imperfections that would not matter at the intended viewing size.',
      'Localize the defect when possible so the host can use a targeted edit.',
      'Do not use artifact cleanup as an excuse to restyle or recomposite the image.',
      'After a fix, re-check the repaired area and nearby locked elements for edit seams or regressions.',
    ],
    successSignal:
      'No material visible artifact remains that would justify another image-tool call.',
  },
};

export function buildImagePassProtocol(input: ToolInput): ImagePassOutput {
  const selectedPasses = [...new Set(input.passes)].slice(0, 3);
  const visualValueGatePassed =
    input.visualValueGatePassed ??
    Boolean(
      input.briefLock ||
        input.referenceLock ||
        input.improvementGatePassed !== undefined ||
        selectedPasses.length > 0,
    );

  const improvementTarget = input.improvementTarget?.trim() || null;
  const isReview = input.phase === 'review';
  const improvementGateApplies = isReview && visualValueGatePassed;
  const improvementGatePassed = improvementGateApplies
    ? input.improvementGatePassed ?? (improvementTarget !== null || selectedPasses.length > 0)
    : null;

  if (input.phase === 'preflight') {
    if (
      input.improvementGatePassed !== undefined ||
      improvementTarget !== null ||
      input.reviewFindings.length > 0 ||
      selectedPasses.length > 0 ||
      input.changeScope !== undefined ||
      input.editStrategy !== undefined
    ) {
      throw new Error(
        'Preflight only establishes the Visual Value Gate and locks. Review-only fields must be omitted and passes must be empty.',
      );
    }
  }

  if (!visualValueGatePassed) {
    if (
      input.improvementGatePassed !== undefined ||
      improvementTarget !== null ||
      selectedPasses.length > 0 ||
      input.editStrategy !== undefined
    ) {
      throw new Error(
        'Visual Value Gate failed, so do not route review passes or an edit strategy.',
      );
    }
  }

  if (improvementGatePassed === true && improvementTarget === null) {
    throw new Error(
      'Visual Improvement Gate passed, so provide a concrete improvementTarget.',
    );
  }

  if (improvementGatePassed === false && selectedPasses.length > 0) {
    throw new Error(
      'Visual Improvement Gate found no material problem, so passes must be empty.',
    );
  }

  if (
    isReview &&
    visualValueGatePassed &&
    improvementGatePassed === true &&
    selectedPasses.length === 0
  ) {
    throw new Error(
      'Visual Improvement Gate passed, so select at least one useful image pass.',
    );
  }

  if (
    isReview &&
    visualValueGatePassed &&
    improvementGatePassed === true &&
    input.editStrategy === undefined
  ) {
    throw new Error(
      'A routed review requires an editStrategy: targeted_edit or regenerate.',
    );
  }

  if (
    isReview &&
    improvementGatePassed !== true &&
    input.editStrategy !== undefined
  ) {
    throw new Error(
      'Do not select an editStrategy when no material visual improvement is being routed.',
    );
  }

  const workflowActive = visualValueGatePassed;
  const reviewStops = isReview && improvementGatePassed === false;
  const zeroPass = !workflowActive || reviewStops;
  const protocol =
    isReview && workflowActive && improvementGatePassed === true
      ? selectedPasses.map((pass) => PASS_PROTOCOLS[pass])
      : [];

  let finalizationRule: string;
  if (!workflowActive) {
    finalizationRule =
      'Use the host image tool normally. The Visual Value Gate did not justify a formal Image Pass workflow, so do not manufacture extra review rounds.';
  } else if (input.phase === 'preflight') {
    finalizationRule =
      'Lock the brief and references, make one host-native generation or edit, then visually review the actual result before deciding whether another pass is justified.';
  } else if (reviewStops) {
    finalizationRule =
      'Keep the current image. The Visual Improvement Gate found no concrete material problem, so do not edit or regenerate for novelty.';
  } else {
    finalizationRule =
      'Use the selected image passes to prepare one focused host image-tool action with the chosen strategy. State what must change and what must remain unchanged. Apply the Visual Preservation Guard, then run the Stop Check before any further image-tool call.';
  }

  return ImagePassOutputSchema.parse({
    version: '0.1.0',
    phase: input.phase,
    workflowActive,
    visualValueGate: {
      question: VISUAL_VALUE_GATE_QUESTION,
      passed: visualValueGatePassed,
      decision: visualValueGatePassed ? 'use_workflow' : 'skip_workflow',
      rule:
        'Use Image Pass only when locking, reviewing, or preserving visual decisions is expected to materially improve the result over one normal host image-tool call.',
    },
    visualImprovementGate: {
      question: VISUAL_IMPROVEMENT_GATE_QUESTION,
      applies: improvementGateApplies,
      passed: improvementGateApplies ? improvementGatePassed : null,
      decision: !improvementGateApplies
        ? 'not_applicable'
        : improvementGatePassed
          ? 'route'
          : 'stop',
      target: improvementGatePassed ? improvementTarget : null,
      rule:
        'After a current image exists, do not run another image-tool call until a concrete material visual problem, artifact, or lock violation is identified. Vague preference for another version is not enough.',
    },
    zeroPass,
    briefLock: input.briefLock ?? null,
    referenceLock: input.referenceLock ?? null,
    selectedPasses:
      isReview && workflowActive && improvementGatePassed === true
        ? selectedPasses
        : [],
    protocol,
    reviewFindings: isReview ? input.reviewFindings : [],
    changeScope:
      isReview && improvementGatePassed === true ? input.changeScope ?? null : null,
    selectedEditStrategy:
      isReview && improvementGatePassed === true ? input.editStrategy ?? null : null,
    referencePriorityRule: REFERENCE_PRIORITY_RULE,
    editStrategyRule: EDIT_STRATEGY_RULE,
    preservationGuardRule: PRESERVATION_GUARD_RULE,
    stopRule: STOP_RULE,
    finalizationRule,
  });
}

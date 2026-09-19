---
name: image-pass
description: Improve image-generation and image-editing workflows by locking the brief and references, reviewing only concrete visual problems, routing up to three high-value visual passes, preferring targeted edits over full regeneration, preserving already-correct traits, and stopping when another round would only add variation rather than material improvement.
---

# Image Pass

Use this workflow around the host ChatGPT image generation/editing tool. Image Pass does not generate images itself and never calls another model.

## Core rule

Do not regenerate merely because another version is possible.

Before another image-tool call, identify:
- the concrete visual problem;
- what must remain unchanged;
- the smallest image operation likely to fix it.

Zero review passes is a valid outcome.

Do not expose private chain-of-thought. Give the user the image result or concise visual conclusion, not a transcript of the internal review.

## 1. Visual Value Gate

Before activating the formal workflow, ask:

> Would a formal visual lock-and-review workflow materially improve this image task over one normal host image-tool call?

If no:
- use the host image tool normally;
- do not manufacture a pass ritual.

If yes:
- continue to Brief / Reference Lock.

Typical reasons to pass the gate:
- the user supplied one or more references;
- character, identity, layout, typography, palette, framing, or style must remain consistent;
- the image is being iterated rather than generated once;
- a prior result already contains accepted visual decisions that must not drift.

## 2. Brief / Reference Lock

Before the first generation or edit, explicitly lock the visual contract.

### Brief Lock

Capture only material constraints:
- `mustHave` — elements the result needs;
- `mustNotChange` — accepted elements that must survive the next iteration;
- `mayChange` — areas with real freedom;
- `avoid` — concrete unwanted traits or failure modes.

Do not turn every descriptive word into a hard lock.

### Reference Lock

For each reference, assign a role. Examples:
- primary;
- style;
- composition;
- typography;
- palette;
- subject;
- texture.

Always name one primary reference when the user clearly has a main inspiration.

For each reference, lock only the traits that matter. Do not indiscriminately blend every visible trait from every reference.

Resolve conflicts in this order:
1. explicit user brief;
2. preservation requirements from the current accepted target image;
3. primary reference;
4. role-specific secondary references;
5. model taste.

A lower-priority reference must not silently override a higher-priority lock.

## 3. Generate or edit once

Use the host ChatGPT image tool.

For an initial generation:
- translate the lock into a clear image instruction;
- include the primary visual hierarchy;
- avoid adding decorative detail that is not needed.

For an existing image:
- default to editing the supplied image;
- do not regenerate from scratch unless the requested change actually requires it.

## 4. Visual Review

Review the actual generated or edited image before deciding whether another tool call is justified.

Do not ask only whether the image “could be better”.

Look for concrete mismatches:
- brief violation;
- composition problem;
- reference drift;
- fidelity regression;
- visible artifact.

Ignore tiny imperfections that would not matter at the intended viewing size.

## 5. Visual Improvement Gate

After a current image exists, ask:

> Is there a concrete visual mismatch, artifact, or lock violation whose correction is expected to materially improve the current image?

If no:
- choose zero passes;
- keep the current image;
- stop.

If yes:
- state one concise `improvementTarget`;
- select only the smallest useful pass set;
- decide whether the correction is local, global, or mixed;
- choose targeted edit or regeneration.

“Try another one”, “make it cooler”, or “maybe it can be better” are not sufficient improvement targets by themselves.

## 6. Route

Choose zero to three passes from:
- BRIEF
- COMPOSITION
- REFERENCE
- FIDELITY
- ARTIFACT

Do not run more than three initial passes.

If an MCP tool named `image_pass` is available, **you are the router**:
1. in `preflight`, apply the Visual Value Gate yourself, provide the locks, and use no review passes;
2. generate or edit with the host image tool;
3. visually inspect the returned image yourself;
4. in `review`, apply the Visual Improvement Gate yourself;
5. if the gate fails, call with `improvementGatePassed: false` and `passes: []`;
6. if it passes, provide a concrete `improvementTarget`, select one to three passes, classify the change scope, and choose `targeted_edit` or `regenerate`;
7. follow the returned protocol using the same host image tool.

Do not ask the MCP server to inspect the image or choose the route. It is intentionally API-free and deterministic.

If the MCP tool is unavailable, run the same workflow natively from this skill.

## 7. Passes

### BRIEF

Use when the current image may violate explicit task requirements.

Check:
- missing required elements;
- incorrect substitutions;
- forbidden additions;
- accidental changes to locked content.

Do not invent new requirements after seeing the image.

### COMPOSITION

Use when the problem concerns:
- framing;
- crop;
- camera angle;
- hierarchy;
- scale;
- spacing;
- negative space;
- spatial relationship of important elements.

Separate a local placement issue from a global composition failure.

Do not redesign the whole image to fix one small positional problem.

### REFERENCE

Use when the result may have drifted from a supplied reference.

Check only the visual traits assigned to that reference's role.

Examples:
- a composition reference should not silently become a costume reference;
- a typography reference should not silently override the locked palette;
- a secondary reference should not outrank the primary reference.

Judge concrete drift, not vague similarity.

### FIDELITY

Use when an existing image already contains accepted traits that must survive an edit.

Check for unintended changes to:
- subject or character identity;
- pose;
- clothing;
- props;
- typography;
- logo;
- frame;
- layout;
- palette;
- other explicitly preserved traits.

An edit that fixes the requested area but damages an accepted area is a regression.

### ARTIFACT

Use for visible generation/editing defects such as:
- broken anatomy;
- warped geometry;
- duplicated objects;
- masking seams;
- inconsistent edges or lighting;
- corrupted text;
- obvious synthesis errors.

Localize the defect when possible.

Do not use artifact cleanup as an excuse to change the image's style or composition.

## 8. Targeted Edit First

Prefer a targeted edit when:
- the issue is local;
- the surrounding image is already good;
- the requested change can be isolated;
- preservation matters.

Regenerate only when:
- the core composition is wrong;
- camera or pose is fundamentally wrong;
- the overall layout or style system is wrong;
- the failure spans multiple coupled regions;
- a targeted edit cannot safely fix the problem.

When regenerating, restate every active lock.

## 9. Visual Preservation Guard

Use this whenever an existing image is revised.

Before the next image-tool call:
- identify the already-correct elements that could regress;
- include them in the preservation instruction.

After the call:
- compare them again;
- do not accept a local improvement if it silently damages accepted composition, identity, typography, palette, layout, or reference fidelity.

Change preserved elements only when the improvement target specifically requires it.

## 10. Stop Check

After the selected passes and resulting image-tool call, ask:

> Is there a specific remaining visual problem or lock violation whose correction is expected to materially improve brief compliance or image quality?

If no:
- stop.

If yes:
- run at most **one additional targeted pass** focused only on that problem.

Do not enter repeated generation loops once remaining differences are subjective variation rather than material defects.

## 11. Final response

Return the useful result directly.

When an image was generated or edited, let the image be the primary output.

Do not narrate the full Image Pass workflow unless the user asks how the result was reached.

## Common triggers

Treat prompts like these as strong signals for this skill:
- “Nézd meg Image Pass-szal.”
- “Lehetne jobb ez a kép?”
- “Javítsd, de a többi maradjon.”
- “Használd ezt mindig fő inspónak.”
- “Ne drifteljen el a karakter.”
- “Csak ezt az egy részt változtasd.”
- “Ne generáld újra az egészet.”
- “Mi a konkrét baja?”

The literal wording is not required; apply the same logic to equivalent requests in any language.

# Image Pass

Image Pass is an **API-free visual iteration protocol** for ChatGPT/Codex-style hosts that already have their own image generation/editing capability.

Its job is simple:

> Do not regenerate just because another version is possible. First lock what matters, inspect the actual image, identify a concrete visual problem, and use the smallest edit likely to fix it without damaging what is already good.

The host model keeps the intelligence, conversation context, image understanding, and native image tool. The MCP server does **not** call another model, does **not** generate images, and does **not** require an OpenAI API key.

## v0.1.0

The initial workflow is:

```text
IMAGE TASK
  ↓
VISUAL VALUE GATE
  ├─ no  → normal host image-tool call → FINAL
  └─ yes
       ↓
BRIEF / REFERENCE LOCK
       ↓
HOST GENERATE OR EDIT
       ↓
VISUAL REVIEW
       ↓
VISUAL IMPROVEMENT GATE
  ├─ no material issue → ZERO PASS → FINAL
  └─ material issue
       ↓
ROUTE 1–3 IMAGE PASSES
       ↓
TARGETED EDIT or REGENERATE
       ↓
VISUAL PRESERVATION GUARD
       ↓
STOP CHECK
       ↓
max. 1 extra targeted pass
       ↓
FINAL
```

## Core principles

1. **Host-native image tool.** Image Pass never calls a separate image model.
2. **Visual Value Gate.** Use the formal workflow only when it can materially help.
3. **Brief / Reference Lock.** Decide what matters before the first generation or edit.
4. **Concrete improvement target.** Another image-tool call needs a specific material reason.
5. **Targeted edit first.** Local problem → local edit when possible.
6. **Regenerate only for global failure.** Do not throw away a good image to fix one small area.
7. **Visual Preservation Guard.** A local fix must not silently damage accepted traits.
8. **0–3 passes.** More review is not automatically better.
9. **Maximum one extra targeted pass.** No endless “try another one” loop.
10. **Zero passes is success when the image is already good enough.**

## Passes

### BRIEF

Checks explicit user requirements and lock violations.

Use for:
- missing required elements;
- forbidden additions;
- incorrect substitutions;
- accidental changes to locked requirements.

### COMPOSITION

Checks:
- framing;
- camera;
- crop;
- hierarchy;
- scale;
- spacing;
- negative space;
- spatial relationships.

### REFERENCE

Checks whether the image preserves the traits assigned to each supplied reference.

References have roles. A composition reference is not automatically a typography, costume, palette, or subject reference.

### FIDELITY

Checks whether already-correct traits in the current accepted image survived the edit.

Use for:
- character or subject identity;
- pose;
- clothing;
- typography;
- logo;
- frame;
- layout;
- palette;
- other accepted visual decisions.

### ARTIFACT

Checks material generation/editing defects such as:
- broken anatomy;
- warped geometry;
- duplicated elements;
- masking seams;
- corrupted text;
- visible synthesis errors.

## Visual Value Gate

Before using the formal workflow, the host asks:

> **Would a formal visual lock-and-review workflow materially improve this image task over one normal host image-tool call?**

If no:
- skip Image Pass;
- generate/edit normally.

If yes:
- establish locks before the first image-tool call.

This avoids turning every trivial image request into a ceremony.

## Brief / Reference Lock

### Brief Lock

The protocol supports:

- `mustHave`
- `mustNotChange`
- `mayChange`
- `avoid`

### Reference Lock

References can be assigned roles:

- `primary`
- `style`
- `composition`
- `typography`
- `palette`
- `subject`
- `texture`
- `other`

The host can also record `lockedTraits` per reference and global `forbiddenDrift` rules.

Conflict priority:

1. explicit user brief;
2. preservation requirements from the current accepted target image;
3. primary reference;
4. role-specific secondary references;
5. model taste.

## Visual Improvement Gate

After a current image exists, the host asks:

> **Is there a concrete visual mismatch, artifact, or lock violation whose correction is expected to materially improve the current image?**

If no:
- `zeroPass: true`;
- keep the current image;
- stop.

If yes:
- state `improvementTarget`;
- select one to three passes;
- classify the scope;
- choose `targeted_edit` or `regenerate`.

“Make it better” is not a sufficient improvement target by itself.

## Targeted edit vs. regenerate

Prefer `targeted_edit` when:
- the issue is local;
- the surrounding image is already correct;
- preservation matters;
- the change can be isolated.

Use `regenerate` when:
- the whole composition is wrong;
- camera or pose is fundamentally wrong;
- layout/style architecture is wrong;
- several coupled regions must change;
- a targeted edit cannot safely solve the problem.

When regenerating, restate every active lock.

## Visual Preservation Guard

Before revising an existing image:
- identify already-correct traits that could regress;
- include them in the preservation instruction.

After the host image-tool call:
- compare them again;
- reject accidental drift unless the improvement target required the change.

This is the visual equivalent of Second Pass's Regression Guard.

## Stop rule

After the selected passes and one host image-tool action, ask:

> **Is there a specific remaining visual problem or lock violation whose correction is expected to materially improve brief compliance or image quality?**

If no, stop.

If yes, run **at most one additional targeted pass**, focused only on that issue.

Do not regenerate merely to obtain another variation.

## Architecture

Image Pass follows the same separation of responsibilities as Second Pass:

### Host model

The host:
- sees the image;
- understands the conversation;
- applies both gates;
- creates the locks;
- selects passes;
- chooses targeted edit vs. regenerate;
- calls its own image generation/edit tool;
- visually inspects the result.

### Native skill

`skills/image-pass/SKILL.md` contains the complete workflow and can run without the MCP backend.

### MCP protocol

The `image_pass` MCP tool is deterministic and read-only. It:
- validates phase/gate consistency;
- carries brief/reference locks;
- returns pass protocols;
- preserves the targeted-edit-first rule;
- returns the reference priority, preservation guard, stop rule, and finalization rule.

It does **not** inspect image pixels or call another model.

## MCP phases

### `preflight`

Use before the first generation/edit.

Example:

```json
{
  "task": "Create a character card from the supplied reference.",
  "phase": "preflight",
  "visualValueGatePassed": true,
  "briefLock": {
    "mustHave": ["central character", "ticket-like frame"],
    "mustNotChange": ["orange palette"],
    "mayChange": ["minor decorative texture"],
    "avoid": ["generic glossy 3D look"]
  },
  "referenceLock": {
    "primaryReference": "uploaded card reference",
    "references": [
      {
        "reference": "uploaded card reference",
        "role": "primary",
        "lockedTraits": ["panel structure", "typographic hierarchy"]
      }
    ],
    "forbiddenDrift": ["do not turn it into a modern app card"]
  },
  "passes": []
}
```

### `review`

Use after an actual image exists.

Example:

```json
{
  "task": "Fix the card without changing the accepted frame.",
  "phase": "review",
  "visualValueGatePassed": true,
  "improvementGatePassed": true,
  "improvementTarget": "The face drifted from the accepted target while the frame and layout are already correct.",
  "reviewFindings": [
    {
      "issue": "character face drift",
      "scope": "local",
      "area": "central portrait",
      "material": true
    }
  ],
  "passes": ["reference", "fidelity"],
  "changeScope": "local",
  "editStrategy": "targeted_edit"
}
```

No-material-improvement example:

```json
{
  "task": "Review the corrected image.",
  "phase": "review",
  "visualValueGatePassed": true,
  "improvementGatePassed": false,
  "passes": []
}
```

## Fastest use: bundled skill

The complete native workflow is in:

`skills/image-pass/SKILL.md`

The MCP backend is optional. It is useful when you want:
- a stable machine-readable protocol;
- consistent tool discovery;
- schema validation;
- portable behavior across MCP hosts;
- future persistence or named reference-lock features.

## Local MCP

```bash
git clone https://github.com/sziajoyboy/image_pass.git
cd image_pass
npm install
npm run dev:stdio
```

No model API key is needed.

## Remote MCP

```bash
npm install
npm run typecheck
npm test
npm run build
npm start
```

Endpoints:
- MCP: `http://127.0.0.1:3000/mcp`
- health: `http://127.0.0.1:3000/health`

## Cloudflare Workers

```bash
npm run cf:dry-run
npm run cf:deploy
```

## Render

`render.yaml` is included.

Optional:
- `IMAGE_PASS_BEARER_TOKEN`
- rate limit / host / origin settings from `.env.example`

## Evaluation

Representative cases live under `evals/`.

Do not optimize for more image calls. A correct stop after the first good result is a success.

## Security

Image Pass does not need image bytes in the MCP request. The host sees the image and supplies a textual lock/review contract.

The backend is read-only, deterministic, API-free, and requires no model secret.

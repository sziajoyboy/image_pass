# Image Pass evals

Routing and visual judgment belong to the host model because the host can see the current image and can use its native image generation/editing tool. The MCP backend is deterministic and does not call a model.

## What to measure

For each representative image task, compare baseline generation/editing with Image Pass and record:

1. Did the Visual Value Gate correctly decide whether a formal workflow was worth using?
2. Were the material brief constraints locked before the first image-tool call?
3. Was one primary reference identified when the user clearly supplied one?
4. Were secondary references restricted to explicit roles rather than blended indiscriminately?
5. After the image existed, did the Visual Improvement Gate require a concrete material issue before another call?
6. Did the host select no more than three useful passes?
7. Were REFERENCE and FIDELITY used for different jobs?
8. Was a local problem handled with a targeted edit when possible?
9. Was full regeneration reserved for genuinely global or non-isolatable failures?
10. Did the Visual Preservation Guard catch regressions in already-correct areas?
11. Did the stop rule prevent repeated “try another one” loops?
12. If one extra pass was used, was it targeted to one remaining material problem?

Do not optimize for more iterations. A correct zero-pass stop is a success.

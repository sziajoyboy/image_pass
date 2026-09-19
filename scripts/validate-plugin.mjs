import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const plugin = JSON.parse(
  await readFile(new URL('../plugin.json', import.meta.url), 'utf8'),
);
const marketplace = JSON.parse(
  await readFile(
    new URL('../.agents/plugins/marketplace.json', import.meta.url),
    'utf8',
  ),
);
const skill = await readFile(
  new URL('../skills/image-pass/SKILL.md', import.meta.url),
  'utf8',
);
const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const envExample = await readFile(
  new URL('../.env.example', import.meta.url),
  'utf8',
);

assert(
  plugin.$schema ===
    'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  'plugin.json must target Agent Plugins 1.0.0',
);
assert(plugin.name === 'image-pass', 'plugin name must be image-pass');
assert(plugin.version === packageJson.version, 'plugin and package versions must match');
assert(plugin.version === '0.1.0', 'validator is pinned to v0.1.0');
assert(
  typeof plugin.description === 'string' && plugin.description.length > 20,
  'plugin description is too short',
);

const entry = marketplace.plugins?.find((item) => item.name === 'image-pass');
assert(entry, 'marketplace must include image-pass');
assert(entry.source?.source === 'url', 'marketplace source must use a Git URL');
assert(entry.source?.ref === 'main', 'marketplace source must pin the main branch');
assert(
  entry.source?.url === 'https://github.com/sziajoyboy/image_pass.git',
  'marketplace source URL must point to the hosting repository',
);

assert(skill.startsWith('---\n'), 'skill must start with YAML frontmatter');
assert(skill.includes('name: image-pass'), 'skill frontmatter name must be image-pass');
assert(skill.includes('## 1. Visual Value Gate'), 'skill must expose the Visual Value Gate');
assert(skill.includes('## 5. Visual Improvement Gate'), 'skill must expose the Visual Improvement Gate');
assert(skill.includes('## 8. Targeted Edit First'), 'skill must expose targeted-edit-first routing');
assert(skill.includes('## 9. Visual Preservation Guard'), 'skill must expose the Preservation Guard');
assert(skill.includes('Zero review passes is a valid outcome.'), 'skill must preserve zero-pass');
assert(skill.includes('you are the router'), 'host model must remain the router');
assert(skill.includes('at most **one additional targeted pass**'), 'skill must preserve one extra pass limit');

const allDependencies = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
assert(
  !Object.keys(allDependencies).some((name) => name.startsWith('@openai/')),
  'Image Pass must not depend on an OpenAI backend SDK',
);
assert(!envExample.includes('OPENAI_API_KEY'), 'Image Pass must not require OPENAI_API_KEY');

console.log(
  JSON.stringify({
    ok: true,
    plugin: plugin.name,
    version: plugin.version,
    skill: 'image-pass',
    apiFree: true,
    visualValueGate: true,
    visualImprovementGate: true,
    targetedEditFirst: true,
    preservationGuard: true,
  }),
);

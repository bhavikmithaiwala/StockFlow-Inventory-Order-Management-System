import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
assert.equal(manifest.private, true, 'The workspace must not be published');
assert.deepEqual(manifest.workspaces, ['apps/*']);
for (const command of ['build', 'typecheck', 'lint', 'test', 'dev:client', 'dev:api']) {
  assert.equal(typeof manifest.scripts[command], 'string', `Missing ${command}`);
}
console.log('Workspace manifest checks passed');

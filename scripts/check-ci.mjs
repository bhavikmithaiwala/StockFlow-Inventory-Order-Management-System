import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const workflow = yaml.load(
  readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
);
assert.deepEqual(workflow.on.push.branches, ['main']);
assert.equal(workflow.permissions.contents, 'read');
assert.equal(workflow.jobs.verify['timeout-minutes'], 25);
const commands = workflow.jobs.verify.steps.map((step) => step.run ?? '').join('\n');
for (const command of [
  'npm ci',
  'docker compose up -d --wait',
  'check-replica.mjs',
  'npm run lint',
  'npm run format:check',
  'npm run typecheck',
  'npm run build',
  'npm test --workspace @stockflow/api',
  'npm test --workspace @stockflow/client',
  'npm run test:e2e',
])
  assert.ok(commands.includes(command), `Missing verification: ${command}`);
const compose = yaml.load(readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8'));
assert.ok(compose.services.mongodb.command.includes('--replSet'));
assert.ok(compose.services.mongodb.healthcheck.test.join(' ').includes('isWritablePrimary'));
console.log(
  'Workflow/Compose YAML parsed; verification stages and replica-set health configuration checked. Docker execution not implied.',
);

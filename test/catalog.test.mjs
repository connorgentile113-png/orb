import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeName } from '../src/catalog.mjs';

test('parses provider prefix while preserving model slashes', () => {
  assert.deepEqual(parseRoute('github/openai/gpt-4.1-mini'), {
    providerId: 'github', model: 'openai/gpt-4.1-mini',
  });
  assert.equal(routeName('ollama', 'qwen2.5:1.5b'), 'ollama/qwen2.5:1.5b');
});

test('does not treat an unknown model namespace as a provider', () => {
  assert.deepEqual(parseRoute('vendor/model'), { providerId: null, model: 'vendor/model' });
});

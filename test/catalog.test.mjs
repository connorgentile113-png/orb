import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeName } from '../src/catalog.mjs';
import { modelIdsFromResponse } from '../src/client.mjs';

test('parses provider prefix while preserving model slashes', () => {
  assert.deepEqual(parseRoute('github/openai/gpt-4.1-mini'), {
    providerId: 'github', model: 'openai/gpt-4.1-mini',
  });
  assert.equal(routeName('ollama', 'qwen2.5:1.5b'), 'ollama/qwen2.5:1.5b');
});

test('filters dynamic catalogs down to free routes', () => {
  const suffixProvider = { modelPolicy: 'free-suffix' };
  assert.deepEqual(modelIdsFromResponse(suffixProvider, { data: [
    { id: 'paid/model' }, { id: 'free/model:free' }, { id: 'openrouter/free' },
  ] }), ['free/model:free', 'openrouter/free']);

  const includedProvider = { modelPolicy: 'included-tier' };
  assert.deepEqual(modelIdsFromResponse(includedProvider, { data: [
    { id: 'metered', usage_based_only: true }, { id: 'included', usage_based_only: false },
  ] }), ['included']);
});

test('does not treat an unknown model namespace as a provider', () => {
  assert.deepEqual(parseRoute('vendor/model'), { providerId: null, model: 'vendor/model' });
});

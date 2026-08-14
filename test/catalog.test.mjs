import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, PROVIDERS, routeName } from '../src/catalog.mjs';
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

  const tierProvider = { modelPolicy: 'free-tier' };
  assert.deepEqual(modelIdsFromResponse(tierProvider, { data: [
    { id: 'free-by-price', pricepermilliontokens: 0, output_pricepermilliontokens: 0 },
    { id: 'free-by-nested-price', pricing: { prompt: '0', completion: '0' } },
    { id: 'free-by-name:free', tier: 'metered' },
    { id: 'free-tier-but-metered', tier: 'free', pricepermilliontokens: 2, output_pricepermilliontokens: 3 },
  ] }), ['free-by-price', 'free-by-nested-price', 'free-by-name:free']);

  const basicProvider = { modelPolicy: 'basic-free' };
  assert.deepEqual(modelIdsFromResponse(basicProvider, { text: [
    { id: 'zero-basic', min_plan: 'BASIC', pricing: { prompt: '0', completion: '0' } },
    { id: 'metered-basic', min_plan: 'BASIC', pricing: { prompt: '0.1', completion: '0.2' } },
    { id: 'zero-paid-plan', min_plan: 'GO', pricing: { prompt: '0', completion: '0' } },
  ] }), ['zero-basic']);

  const chatProvider = { chatOnly: true };
  assert.deepEqual(modelIdsFromResponse(chatProvider, { data: [
    { id: 'chat-model', max_completion_tokens: 4096 },
    { id: 'embedding-model', max_completion_tokens: 0 },
    { id: 'Safety-Guard', max_completion_tokens: 4096 },
    { id: 'voiceover', supports_chat: false },
    { id: 'text-to-image', output_modalities: ['image'] },
    { id: 'dall-e-3', supported_endpoints: ['images.generations'], architecture: { output_modalities: ['image'] } },
    { id: 'endpoint-chat', supported_endpoints: ['chat.completions'], architecture: { output_modalities: ['text'] } },
  ] }), ['chat-model', 'endpoint-chat']);
});

test('does not treat an unknown model namespace as a provider', () => {
  assert.deepEqual(parseRoute('vendor/model'), { providerId: null, model: 'vendor/model' });
});

test('provider catalog has unique identities and valid automatic routes', () => {
  const ids = PROVIDERS.map(provider => provider.id);
  assert.equal(new Set(ids).size, ids.length);
  const envNames = PROVIDERS.map(provider => provider.env).filter(Boolean);
  assert.equal(new Set(envNames).size, envNames.length);
  for (const provider of PROVIDERS) {
    if (provider.baseUrl) assert.doesNotThrow(() => new URL(provider.baseUrl), provider.id);
    if (!provider.autoModel) continue;
    assert.equal(provider.models.includes(provider.autoModel), true, `${provider.id} auto model is seeded`);
    assert.equal(Number.isFinite(provider.autoPriority), true, `${provider.id} auto priority is numeric`);
  }
});

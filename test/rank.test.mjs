import test from 'node:test';
import assert from 'node:assert/strict';
import { rankCodingModels } from '../src/rank.mjs';

const providers = [
  { id: 'auto', kind: 'virtual', keyless: true, badge: 'AUTO' },
  { id: 'local', kind: 'local', keyless: true, badge: 'LOCAL' },
  { id: 'free', kind: 'community', keyless: false, badge: 'FREE MODELS' },
  { id: 'paid', kind: 'cloud', keyless: false, badge: 'METERED' },
];

const catalog = new Map([
  ['auto', ['free']],
  ['local', ['tiny-1b']],
  ['free', ['cohere/north-mini-code:free', 'embedding-model']],
  ['paid', ['claude-opus-5']],
]);

test('accuracy ranking favors the strongest connected coding model', () => {
  const ranked = rankCodingModels(catalog, 'accuracy', providers);
  assert.equal(ranked[0].route, 'paid/claude-opus-5');
  assert.equal(ranked.some(entry => entry.route.startsWith('auto/')), false);
  assert.equal(ranked.some(entry => entry.model === 'embedding-model'), false);
});

test('cost ranking favors a capable explicit free coding route', () => {
  const ranked = rankCodingModels(catalog, 'cost', providers);
  assert.equal(ranked[0].route, 'free/cohere/north-mini-code:free');
  assert.equal(ranked[0].economy > ranked.find(entry => entry.provider.id === 'paid').economy, true);
});

test('coding ranking rejects unknown preferences', () => {
  assert.throws(() => rankCodingModels(catalog, 'fast', providers), /accuracy or cost/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { choose, filterChoices, plain, table, truncate } from '../src/ui.mjs';

function fakeTerminal() {
  const input = new PassThrough();
  const output = new PassThrough();
  input.isTTY = true;
  input.isRaw = false;
  input.setRawMode = value => { input.isRaw = value; };
  output.isTTY = true;
  output.columns = 72;
  output.rows = 18;
  return { input, output };
}

const items = [
  { value: 'alpha', label: 'Alpha', hint: 'local model' },
  { value: 'beta', label: 'Beta Coder', hint: 'free coding route' },
  { value: 'gamma', label: 'Gamma', hint: 'metered model' },
];

test('picker filtering searches labels and hints by every term', () => {
  assert.deepEqual(filterChoices(items, 'free coder').map(choice => choice.item.value), ['beta']);
  assert.equal(truncate('a very long model name', 8), 'a very …');
  assert.equal(plain('\x1b[31mcolored\x1b[0m'), 'colored');
});

test('interactive picker supports arrow-key selection', async () => {
  const { input, output } = fakeTerminal();
  const selected = choose('Choose', items, { input, output });
  setImmediate(() => {
    input.write('\x1b[B');
    setImmediate(() => input.write('\r'));
  });
  assert.equal(await selected, 'beta');
  assert.equal(input.isRaw, false);
});

test('interactive picker supports direct mouse selection', async () => {
  const { input, output } = fakeTerminal();
  const selected = choose('Choose', items, { input, output });
  setImmediate(() => input.write('\x1b[<0;4;8M'));
  assert.equal(await selected, 'beta');
});

test('tables fit long content to the terminal width', () => {
  const output = new PassThrough();
  output.columns = 40;
  let rendered = '';
  output.on('data', chunk => { rendered += chunk; });
  table([['provider', 'an extremely long model identifier that should shrink', 'ready']], [
    { label: 'PROVIDER' }, { label: 'MODEL' }, { label: 'STATUS' },
  ], output);
  assert.equal(rendered.trimEnd().split('\n').every(line => plain(line).length <= 40), true);
});

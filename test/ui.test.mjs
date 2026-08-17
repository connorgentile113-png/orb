import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { choose, chooseRankedModel, filterChoices, parseRichText, plain, renderRichText, table, truncate } from '../src/ui.mjs';

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

test('ranked model picker defaults to the #1 entry on Enter', async () => {
  const { input, output } = fakeTerminal();
  const entries = [{ route: 'a/one' }, { route: 'b/two' }, { route: 'c/three' }];
  const selected = chooseRankedModel(entries, { input, output });
  setImmediate(() => input.write('\n'));
  assert.equal((await selected).route, 'a/one');
});

test('ranked model picker accepts a numbered choice', async () => {
  const { input, output } = fakeTerminal();
  const entries = [{ route: 'a/one' }, { route: 'b/two' }, { route: 'c/three' }];
  const selected = chooseRankedModel(entries, { input, output });
  setImmediate(() => input.write('3\n'));
  assert.equal((await selected).route, 'c/three');
});

test('ranked model picker re-prompts on an invalid number', async () => {
  const { input, output } = fakeTerminal();
  const entries = [{ route: 'a/one' }, { route: 'b/two' }];
  const selected = chooseRankedModel(entries, { input, output });
  setImmediate(() => {
    input.write('9\n');
    setImmediate(() => input.write('2\n'));
  });
  assert.equal((await selected).route, 'b/two');
});

test('ranked model picker skips prompting for a single entry', async () => {
  const { input, output } = fakeTerminal();
  const selected = await chooseRankedModel([{ route: 'only/model' }], { input, output });
  assert.equal(selected.route, 'only/model');
});

test('rich responses parse thinking and fenced code blocks', () => {
  const blocks = parseRichText('<thinking>check edge cases</thinking>\n**Done**\n```js\nconst ok = true;\n```');
  assert.deepEqual(blocks.map(block => block.type), ['thinking', 'text', 'code']);
  assert.match(plain(renderRichText(blocks.map(block => block.type === 'thinking' ? `<thinking>${block.content}</thinking>` : block.type === 'code' ? `\`\`\`${block.language}\n${block.content}\n\`\`\`` : block.content).join(''))), /Thinking hidden/);
  assert.match(plain(renderRichText('<thinking>detail</thinking>', { thinking: true })), /detail/);
  assert.match(plain(renderRichText('**Bold** and *italic*\n```python\nprint(1)\n```')), /┌─ python[\s\S]*print\(1\)[\s\S]*└─/);
});

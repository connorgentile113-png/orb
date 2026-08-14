import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { autoRouteCandidates, completionText, createChatCompletion, discoverModels, streamCompletion } from '../src/client.mjs';
import { emptyConfig } from '../src/config.mjs';
import { PROVIDER_BY_ID } from '../src/catalog.mjs';

test('automatic route override excludes recursive auto entries', async () => {
  assert.deepEqual(
    await autoRouteCandidates(emptyConfig(), { ORB_AUTO_ROUTES: 'auto/free, opencode/big-pickle, kilo/openrouter/free' }),
    ['opencode/big-pickle', 'kilo/openrouter/free'],
  );
});

test('automatic routing adds configured free-only providers before keyless fallbacks', async () => {
  const config = { ...emptyConfig(), keys: {
    airforce: 'test', bazaarlink: 'test', electronhub: 'test', navy: 'test',
    helyx: 'test', 'yolo-auto': 'test', morph: 'test', mnn: 'test', speka: 'test',
    freeinference: 'test',
  } };
  const routes = await autoRouteCandidates(config, { ORB_DISABLE_LOCAL: '1' });
  assert.deepEqual(routes.slice(0, 6), [
    'electronhub/deepseek-v4-flash:free', 'navy/nemotron-3-super',
    'helyx/gemma-4-31B-it', 'yolo-auto/qwen3.6-35b-a3b',
    'bazaarlink/auto:free', 'airforce/gemma3-270m:free',
  ]);
  assert.equal(routes.includes('morph/morph-v3-fast'), false);
  assert.equal(routes.some(route => route.startsWith('mnn/')), false);
  assert.equal(routes.some(route => route.startsWith('speka/')), false);
  assert.equal(routes.some(route => route.startsWith('freeinference/')), false);
  assert.equal(routes.includes('opencode/big-pickle'), true);
});

test('public model catalogs can be refreshed before adding an API key', async t => {
  const upstream = http.createServer((request, response) => {
    assert.equal(request.url, '/v1/models');
    assert.equal(request.headers.authorization, undefined);
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ data: [
      { id: 'free-model:free', tier: 'free' },
      { id: 'paid-model', tier: 'free', pricepermilliontokens: 1, output_pricepermilliontokens: 2 },
    ] }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const config = {
    ...emptyConfig(),
    providers: { airforce: { baseUrl: `http://127.0.0.1:${upstream.address().port}/v1` } },
  };
  assert.deepEqual(await discoverModels(PROVIDER_BY_ID.get('airforce'), config), ['free-model:free']);
});

test('provider safety headers are forwarded to free-model gateways', async t => {
  const upstream = http.createServer(async (request, response) => {
    assert.equal(request.headers.authorization, 'Bearer test-key');
    assert.equal(request.headers['x-free-fallback'], 'false');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'safe free route' } }] }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const config = {
    ...emptyConfig(), keys: { bazaarlink: 'test-key' },
    providers: { bazaarlink: { baseUrl: `http://127.0.0.1:${upstream.address().port}/v1` } },
  };
  assert.equal(await completionText({ route: 'bazaarlink/auto:free', messages: [], config }), 'safe free route');
});

test('adapts Ollama Cloud native responses to OpenAI chat responses', async t => {
  const upstream = http.createServer(async (request, response) => {
    assert.equal(request.url, '/api/chat');
    assert.equal(request.headers.authorization, 'Bearer cloud-test-key');
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    assert.equal(body.model, 'test-cloud');
    response.setHeader('content-type', 'application/x-ndjson');
    if (body.stream) {
      response.write(`${JSON.stringify({ model: body.model, message: { role: 'assistant', content: 'cloud ' }, done: false })}\n`);
      return response.end(`${JSON.stringify({ model: body.model, message: { role: 'assistant', content: 'works' }, done: true })}\n`);
    }
    response.end(JSON.stringify({ model: body.model, message: { role: 'assistant', content: 'cloud works' }, done: true, prompt_eval_count: 2, eval_count: 3 }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const config = {
    ...emptyConfig(), selected: 'ollama-cloud/test-cloud',
    keys: { 'ollama-cloud': 'cloud-test-key' },
    providers: { 'ollama-cloud': { baseUrl: `http://127.0.0.1:${upstream.address().port}/api` } },
  };
  assert.equal(await completionText({ route: config.selected, messages: [], config }), 'cloud works');
  let streamed = '';
  await streamCompletion({ route: config.selected, messages: [], config }, text => { streamed += text; });
  assert.equal(streamed, 'cloud works');
});

test('adapts Anthropic messages and thinking to OpenAI chat responses', async t => {
  const upstream = http.createServer(async (request, response) => {
    assert.equal(request.url, '/v1/messages');
    assert.equal(request.headers['x-api-key'], 'anthropic-test-key');
    assert.equal(request.headers['anthropic-version'], '2023-06-01');
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    assert.equal(body.system, 'Be concise.');
    assert.deepEqual(body.messages, [{ role: 'user', content: 'hello' }]);
    if (body.stream) {
      response.setHeader('content-type', 'text/event-stream');
      response.write(`data: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } })}\n\n`);
      response.write(`data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'check first' } })}\n\n`);
      response.write(`data: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`);
      response.write(`data: ${JSON.stringify({ type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } })}\n\n`);
      response.write(`data: ${JSON.stringify({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Hello!' } })}\n\n`);
      return response.end(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
    }
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      id: 'msg_test', model: body.model, stop_reason: 'end_turn',
      content: [{ type: 'thinking', thinking: 'check first' }, { type: 'text', text: 'Hello!' }],
      usage: { input_tokens: 2, output_tokens: 3 },
    }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const config = {
    ...emptyConfig(), keys: { anthropic: 'anthropic-test-key' },
    providers: { anthropic: { baseUrl: `http://127.0.0.1:${upstream.address().port}/v1` } },
  };
  assert.equal(await completionText({
    route: 'anthropic/claude-test',
    messages: [{ role: 'system', content: 'Be concise.' }, { role: 'user', content: 'hello' }], config,
  }), '<thinking>check first</thinking>Hello!');
  let streamed = '';
  await streamCompletion({
    route: 'anthropic/claude-test',
    messages: [{ role: 'system', content: 'Be concise.' }, { role: 'user', content: 'hello' }], config,
  }, text => { streamed += text; });
  assert.equal(streamed, '<thinking>check first</thinking>Hello!');
});

test('normalizes OpenAI-compatible reasoning content into thinking blocks', async t => {
  const upstream = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    response.setHeader('content-type', body.stream ? 'text/event-stream' : 'application/json');
    if (body.stream) {
      response.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'check ' } }] })}\n\n`);
      response.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'carefully' } }] })}\n\n`);
      response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Done.' } }] })}\n\n`);
      return response.end('data: [DONE]\n\n');
    }
    response.end(JSON.stringify({ choices: [{ message: {
      role: 'assistant', reasoning_content: 'check carefully', content: 'Done.',
    } }] }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const config = {
    ...emptyConfig(), keys: { gmi: 'test-key' },
    providers: { gmi: { baseUrl: `http://127.0.0.1:${upstream.address().port}/v1` } },
  };
  assert.equal(await completionText({ route: 'gmi/test', messages: [], config }), '<thinking>check carefully</thinking>Done.');
  let streamed = '';
  await streamCompletion({ route: 'gmi/test', messages: [], config }, text => { streamed += text; });
  assert.equal(streamed, '<thinking>check carefully</thinking>Done.');
});

test('auto/free falls back after an upstream failure', async t => {
  const upstream = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    if (request.url.startsWith('/first/')) {
      response.writeHead(429, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ error: { message: 'rate limited' } }));
    }
    assert.equal(body.model, 'openrouter/free');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'fallback worked' } }] }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const base = `http://127.0.0.1:${upstream.address().port}`;
  const config = {
    ...emptyConfig(), selected: 'auto/free',
    providers: {
      opencode: { baseUrl: `${base}/first` },
      kilo: { baseUrl: `${base}/second` },
    },
  };
  const response = await createChatCompletion({
    route: 'auto/free', messages: [{ role: 'user', content: 'hello' }], config,
    env: { ORB_AUTO_ROUTES: 'opencode/big-pickle,kilo/openrouter/free' },
  });
  assert.equal(response.headers.get('x-orb-route'), 'kilo/openrouter/free');
  assert.equal((await response.json()).choices[0].message.content, 'fallback worked');
});

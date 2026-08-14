import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { emptyConfig } from '../src/config.mjs';
import { createOrbServer } from '../src/server.mjs';

test('health endpoint declares auth-free local API', async t => {
  const server = createOrbServer({ ...emptyConfig(), selected: 'ollama/test' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: 'orb', auth: false, selected: 'ollama/test' });
});

test('proxies a non-streaming OpenAI chat request', async t => {
  const upstream = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    assert.equal(request.url, '/v1/chat/completions');
    assert.equal(body.model, 'tiny');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'hello' } }] }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => upstream.close());
  const upstreamPort = upstream.address().port;
  const config = {
    ...emptyConfig(), selected: 'llamacpp/tiny',
    providers: { llamacpp: { baseUrl: `http://127.0.0.1:${upstreamPort}/v1` } },
  };
  const orb = createOrbServer(config);
  await new Promise(resolve => orb.listen(0, '127.0.0.1', resolve));
  t.after(() => orb.close());
  const response = await fetch(`http://127.0.0.1:${orb.address().port}/v1/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).choices[0].message.content, 'hello');
});

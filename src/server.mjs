import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { PROVIDER_BY_ID, routeName } from './catalog.mjs';
import { availableModels, createChatCompletion, isConfigured } from './client.mjs';
import { chatStreamToResponses, chatToResponseItems, createSignatureCache, responsesObject, toChatRequest } from './responses.mjs';

const MAX_BODY = 2 * 1024 * 1024;

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}

export function createOrbServer(config, { env = process.env } = {}) {
  // Gemini thinking models require their per-function-call `thought_signature`
  // to be echoed back on the next turn. It can't ride in the Responses API, so
  // keep a process-scoped cache keyed by tool-call id across requests.
  const signatures = createSignatureCache();
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://orb.local');
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
        return sendJson(response, 200, { ok: true, service: 'orb', auth: false, selected: config.selected || null });
      }
      if (request.method === 'GET' && url.pathname === '/v1/models') {
        const providers = [...PROVIDER_BY_ID.values()].filter(provider => isConfigured(provider, config, env));
        const catalog = await availableModels(config, { env, providers });
        const data = providers.flatMap(provider => (catalog.get(provider.id) || []).map(model => ({
          id: routeName(provider.id, model), object: 'model', owned_by: provider.id,
        })));
        return sendJson(response, 200, { object: 'list', data });
      }
      if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
        const body = await readJson(request);
        const upstream = await createChatCompletion({
          route: body.model || config.selected, messages: body.messages || [], stream: Boolean(body.stream),
          temperature: body.temperature, config, env, signal: AbortSignal.timeout(120_000),
        });
        response.writeHead(upstream.status, Object.fromEntries(
          [...upstream.headers.entries()].filter(([name]) => ['content-type', 'cache-control', 'x-orb-route'].includes(name.toLowerCase())),
        ));
        for await (const chunk of upstream.body) response.write(chunk);
        return response.end();
      }
      if (request.method === 'POST' && url.pathname === '/v1/responses') {
        const body = await readJson(request);
        const chat = toChatRequest(body, signatures);
        const route = chat.route || config.selected;
        const upstream = await createChatCompletion({
          route, messages: chat.messages, stream: chat.stream, tools: chat.tools,
          toolChoice: chat.toolChoice, maxTokens: chat.maxTokens, temperature: chat.temperature,
          config, env, signal: AbortSignal.timeout(120_000),
        });
        const id = `resp_${randomUUID()}`;
        if (chat.stream) {
          const stream = chatStreamToResponses(upstream.body, { id, model: route, signatures });
          response.writeHead(200, {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache',
            'x-orb-route': route,
          });
          for await (const chunk of stream) response.write(chunk);
          return response.end();
        }
        const completion = await upstream.json();
        return sendJson(response, 200, responsesObject({
          id, model: route,
          items: chatToResponseItems(completion.choices?.[0]?.message, signatures),
          usage: completion.usage,
        }));
      }
      return sendJson(response, 404, { error: { message: 'Route not found.', type: 'not_found' } });
    } catch (error) {
      if (!response.headersSent) sendJson(response, error.status || 502, { error: { message: error.message, type: 'orb_error' } });
      else response.destroy(error);
    }
  });
}

export async function listen(config, { host = '127.0.0.1', port = 11435, env = process.env } = {}) {
  const server = createOrbServer(config, { env });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return server;
}

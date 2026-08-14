import http from 'node:http';
import { PROVIDER_BY_ID, routeName } from './catalog.mjs';
import { availableModels, createChatCompletion, isConfigured } from './client.mjs';

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
          [...upstream.headers.entries()].filter(([name]) => ['content-type', 'cache-control'].includes(name.toLowerCase())),
        ));
        for await (const chunk of upstream.body) response.write(chunk);
        return response.end();
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

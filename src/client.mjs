import { PROVIDER_BY_ID, parseRoute, routeName } from './catalog.mjs';
import { providerBaseUrl, providerKey } from './config.mjs';

const DEFAULT_AUTO_ROUTES = Object.freeze([
  'opencode/big-pickle',
  'kilo/stepfun/step-3.7-flash:free',
  'llm7/gpt-oss:20b',
  'pollinations/openai-fast',
  'ovh/gpt-oss-20b',
]);

function timeoutSignal(ms) {
  return AbortSignal.timeout(Number.isFinite(ms) ? ms : 90_000);
}

function headersFor(provider, key) {
  const headers = { accept: 'application/json', 'content-type': 'application/json', ...provider.headers };
  if (key) headers.authorization = `Bearer ${key}`;
  return headers;
}

async function jsonOrError(response) {
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { error: { message: text.slice(0, 500) } }; }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export function resolveRoute(route, config) {
  const parsed = parseRoute(route || config.selected);
  if (!parsed.providerId || !parsed.model) {
    throw new Error('No model selected. Run `orb use` first.');
  }
  const provider = PROVIDER_BY_ID.get(parsed.providerId);
  if (!provider) throw new Error(`Unknown provider: ${parsed.providerId}`);
  return { provider, model: parsed.model, route: routeName(provider.id, parsed.model) };
}

export function isConfigured(provider, config, env = process.env) {
  if (provider.id === 'auto') return true;
  const hasEndpoint = !provider.requiresBaseUrl || Boolean(providerBaseUrl(provider, config, env));
  return hasEndpoint && (provider.keyless || Boolean(providerKey(provider, config, env)));
}

export async function autoRouteCandidates(config, env = process.env) {
  const overridden = String(env.ORB_AUTO_ROUTES || '').split(',').map(value => value.trim()).filter(Boolean);
  if (overridden.length) return overridden.filter(route => parseRoute(route).providerId !== 'auto');
  const routes = [];
  if (env.ORB_DISABLE_LOCAL !== '1') {
    try {
      const ollama = PROVIDER_BY_ID.get('ollama');
      const local = await discoverModels(ollama, config, { env, timeout: 800 });
      if (local[0]) routes.push(routeName('ollama', local[0]));
    } catch { /* local inference is optional */ }
  }
  const configuredFree = PROVIDERS_WITH_AUTO_MODELS
    .filter(provider => isConfigured(provider, config, env))
    .map(provider => routeName(provider.id, provider.autoModel));
  return [...new Set([...routes, ...configuredFree, ...DEFAULT_AUTO_ROUTES])];
}

const PROVIDERS_WITH_AUTO_MODELS = [...PROVIDER_BY_ID.values()]
  .filter(provider => provider.autoModel)
  .sort((left, right) => (left.autoPriority || 100) - (right.autoPriority || 100));

export function modelIdsFromResponse(provider, body) {
  if (provider.discover === false) return [...provider.models];
  let items = body.data || body.models || [];
  if (provider.modelPolicy === 'free-suffix') {
    items = items.filter(item => {
      const id = typeof item === 'string' ? item : item.id || item.name || '';
      return id.includes(':free') || id.endsWith('-free') || id === 'openrouter/free';
    });
  }
  if (provider.modelPolicy === 'included-tier') {
    items = items.filter(item => typeof item === 'object' && item.usage_based_only === false);
  }
  if (provider.modelPolicy === 'free-tier') {
    items = items.filter(item => {
      const id = typeof item === 'string' ? item : item.id || item.name || '';
      if (id.includes(':free')) return true;
      if (typeof item !== 'object') return false;
      const input = item.pricepermilliontokens ?? item.pricing?.input ?? item.pricing?.prompt;
      const output = item.output_pricepermilliontokens ?? item.pricing?.output ?? item.pricing?.completion;
      return input !== undefined && output !== undefined && Number(input) === 0 && Number(output) === 0;
    });
  }
  if (provider.chatOnly) {
    items = items.filter(item => {
      if (typeof item === 'string') return true;
      const id = item.id || item.name || '';
      const supportsCompletion = item.max_completion_tokens === undefined || item.max_completion_tokens > 0;
      const chatType = item.model_type === undefined || item.model_type === 'chat';
      const supportsChat = item.supports_chat === undefined || item.supports_chat === true;
      const textOutput = !Array.isArray(item.output_modalities) || item.output_modalities.includes('text');
      return supportsCompletion && chatType && supportsChat && textOutput
        && !/guard|embed|rerank|whisper|stable-diffusion|image-|audio|voice|suno|kling|veo|banana/i.test(id);
    });
  }
  return items.map(item => typeof item === 'string' ? item : item.id || item.name).filter(Boolean);
}

export async function discoverModels(provider, config, { env = process.env, timeout = 5_000 } = {}) {
  if (provider.discover === false) return [...provider.models];
  const key = providerKey(provider, config, env);
  if (!provider.keyless && !key && !provider.publicCatalog) return [];
  if (!providerBaseUrl(provider, config, env)) return [];
  let url = `${providerBaseUrl(provider, config, env)}/models`;
  if (provider.id === 'ollama' || provider.protocol === 'ollama') url = provider.modelsUrl;
  const response = await fetch(url, { headers: headersFor(provider, key), signal: timeoutSignal(timeout) });
  const body = await jsonOrError(response);
  if (provider.id === 'ollama' || provider.protocol === 'ollama') return (body.models || []).map(item => item.model || item.name).filter(Boolean);
  return modelIdsFromResponse(provider, body);
}

export async function availableModels(config, options = {}) {
  const discovered = new Map();
  const providers = options.providers || [...PROVIDER_BY_ID.values()];
  await Promise.all(providers.map(async provider => {
    if (!options.refresh && provider.id !== 'ollama') {
      discovered.set(provider.id, [...provider.models]);
      return;
    }
    try {
      const models = await discoverModels(provider, config, options);
      discovered.set(provider.id, models.length ? models : [...provider.models]);
    } catch {
      discovered.set(provider.id, [...provider.models]);
    }
  }));
  return discovered;
}

function openAiChatBody(value, model) {
  return {
    id: `orb-ollama-${Date.now()}`,
    object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
    choices: [{ index: 0, message: value.message || { role: 'assistant', content: '' }, finish_reason: value.done ? 'stop' : null }],
    usage: {
      prompt_tokens: value.prompt_eval_count || 0,
      completion_tokens: value.eval_count || 0,
      total_tokens: (value.prompt_eval_count || 0) + (value.eval_count || 0),
    },
  };
}

async function normalizeOllamaResponse(response, model, stream) {
  if (!stream) {
    const value = await jsonOrError(response);
    return new Response(JSON.stringify(openAiChatBody(value, model)), {
      status: 200, headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const body = new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        for await (const chunk of response.body) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const value = JSON.parse(line);
            const payload = {
              id: `orb-ollama-${Date.now()}`, object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000), model,
              choices: [{ index: 0, delta: value.message || {}, finish_reason: value.done ? 'stop' : null }],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) { controller.error(error); }
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' } });
}

export async function createChatCompletion({ route, messages, stream = false, config, env = process.env, signal, temperature }) {
  const { provider, model } = resolveRoute(route, config);
  if (provider.id === 'auto') {
    const attempts = [];
    for (const candidate of await autoRouteCandidates(config, env)) {
      try {
        const response = await createChatCompletion({ route: candidate, messages, stream, config, env, signal, temperature });
        const headers = new Headers(response.headers);
        headers.set('x-orb-route', candidate);
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      } catch (error) {
        attempts.push(`${candidate}: ${error.message}`);
      }
    }
    const error = new Error(`Every automatic free route failed. ${attempts.join(' | ')}`);
    error.status = 502;
    throw error;
  }
  const key = providerKey(provider, config, env);
  if (!provider.keyless && !key) throw new Error(`${provider.name} needs ${provider.env}. Run \`orb key set ${provider.id}\`.`);
  if (!providerBaseUrl(provider, config, env)) throw new Error(`${provider.name} needs an account endpoint. Run \`orb endpoint set ${provider.id} <url>\`.`);
  const url = provider.protocol === 'ollama'
    ? `${providerBaseUrl(provider, config, env)}/chat`
    : `${providerBaseUrl(provider, config, env)}/chat/completions`;
  const body = { model, messages, stream };
  if (temperature !== undefined) body.temperature = temperature;
  const response = await fetch(url, {
    method: 'POST', headers: headersFor(provider, key), body: JSON.stringify(body),
    signal: signal || timeoutSignal(120_000),
  });
  if (!response.ok) await jsonOrError(response);
  if (provider.protocol === 'ollama') return normalizeOllamaResponse(response, model, stream);
  return response;
}

export async function completionText(options) {
  const response = await createChatCompletion({ ...options, stream: false });
  const body = await jsonOrError(response);
  return body.choices?.[0]?.message?.content ?? body.choices?.[0]?.text ?? '';
}

function extractSseText(payload) {
  try {
    const value = JSON.parse(payload);
    return value.choices?.[0]?.delta?.content ?? value.choices?.[0]?.message?.content ?? '';
  } catch { return ''; }
}

export async function streamCompletion(options, onText) {
  const response = await createChatCompletion({ ...options, stream: true });
  if (!response.body) throw new Error('Provider returned no response stream.');
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data && data !== '[DONE]') {
        const text = extractSseText(data);
        if (text) onText(text);
      }
    }
  }
}

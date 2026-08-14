import { PROVIDER_BY_ID, parseRoute, routeName } from './catalog.mjs';
import { providerBaseUrl, providerKey } from './config.mjs';

function timeoutSignal(ms) {
  return AbortSignal.timeout(Number.isFinite(ms) ? ms : 90_000);
}

function headersFor(provider, key) {
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
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
  const hasEndpoint = !provider.requiresBaseUrl || Boolean(providerBaseUrl(provider, config, env));
  return hasEndpoint && (provider.keyless || Boolean(providerKey(provider, config, env)));
}

export async function discoverModels(provider, config, { env = process.env, timeout = 5_000 } = {}) {
  const key = providerKey(provider, config, env);
  if (!provider.keyless && !key) return [];
  if (!providerBaseUrl(provider, config, env)) return [];
  let url = `${providerBaseUrl(provider, config, env)}/models`;
  if (provider.id === 'ollama') url = provider.modelsUrl;
  const response = await fetch(url, { headers: headersFor(provider, key), signal: timeoutSignal(timeout) });
  const body = await jsonOrError(response);
  if (provider.id === 'ollama') return (body.models || []).map(item => item.model || item.name).filter(Boolean);
  return (body.data || body.models || []).map(item => typeof item === 'string' ? item : item.id || item.name).filter(Boolean);
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

export async function createChatCompletion({ route, messages, stream = false, config, env = process.env, signal, temperature }) {
  const { provider, model } = resolveRoute(route, config);
  const key = providerKey(provider, config, env);
  if (!provider.keyless && !key) throw new Error(`${provider.name} needs ${provider.env}. Run \`orb key set ${provider.id}\`.`);
  if (!providerBaseUrl(provider, config, env)) throw new Error(`${provider.name} needs an account endpoint. Run \`orb endpoint set ${provider.id} <url>\`.`);
  const url = `${providerBaseUrl(provider, config, env)}/chat/completions`;
  const body = { model, messages, stream };
  if (temperature !== undefined) body.temperature = temperature;
  const response = await fetch(url, {
    method: 'POST', headers: headersFor(provider, key), body: JSON.stringify(body),
    signal: signal || timeoutSignal(120_000),
  });
  if (!response.ok) await jsonOrError(response);
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

#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import process, { stdin, stdout, stderr } from 'node:process';
import { PROVIDERS, PROVIDER_BY_ID, parseRoute, routeName } from '../src/catalog.mjs';
import { loadConfig, saveConfig, configPath, providerBaseUrl, providerKey } from '../src/config.mjs';
import { autoRouteCandidates, availableModels, discoverModels, isConfigured, streamCompletion } from '../src/client.mjs';
import { listen } from '../src/server.mjs';
import { c, choose, logo, paint, secretPrompt, table, usage } from '../src/ui.mjs';

function fail(message, code = 1) {
  stderr.write(`${paint(c.red, 'error')}  ${message}\n`);
  process.exitCode = code;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

async function localDefault(config) {
  if (config.selected || process.env.ORB_DISABLE_LOCAL === '1') return false;
  const ollama = PROVIDER_BY_ID.get('ollama');
  try {
    const models = await discoverModels(ollama, config, { timeout: 1_500 });
    if (!models.length) return false;
    config.selected = routeName('ollama', models[0]);
    saveConfig(config);
    return true;
  } catch { return false; }
}

async function readyCatalog(config, refresh = false) {
  const ready = PROVIDERS.filter(provider => {
    if (process.env.ORB_DISABLE_LOCAL === '1' && provider.kind === 'local') return false;
    return isConfigured(provider, config);
  });
  return availableModels(config, { providers: ready, refresh });
}

async function chooseModel(config) {
  const catalog = await readyCatalog(config, true);
  const ready = PROVIDERS.map(provider => ({ provider, models: catalog.get(provider.id) || [] }))
    .filter(entry => entry.models.length);
  if (!ready.length) throw new Error('No ready models found. Start Ollama or add a cloud key with `orb key set <provider>`.');
  const providerId = ready.length === 1 ? ready[0].provider.id : await choose('Choose a provider', ready.map(({ provider, models }) => ({
    value: provider.id,
    label: provider.name,
    hint: `${provider.badge} · ${models.length} model${models.length === 1 ? '' : 's'}`,
  })));
  const entry = ready.find(item => item.provider.id === providerId);
  const model = entry.models.length === 1 ? entry.models[0] : await choose(`${entry.provider.name} models`, entry.models.map(value => ({
    value,
    label: value,
    hint: routeName(providerId, value) === config.selected ? 'selected' : '',
  })));
  return routeName(providerId, model);
}

async function useCommand(args, config) {
  let selected = args.find(value => !value.startsWith('-')) || '';
  if (!selected) selected = await chooseModel(config);
  const { providerId, model } = parseRoute(selected);
  const provider = PROVIDER_BY_ID.get(providerId);
  if (!provider || !model) throw new Error('Use provider/model, for example `ollama/qwen2.5:1.5b`.');
  if (!isConfigured(provider, config)) throw new Error(`${provider.name} needs ${provider.env}. Run \`orb key set ${provider.id}\`.`);
  config.selected = routeName(providerId, model);
  saveConfig(config);
  stdout.write(`${paint(c.green, '✓')} using ${paint(c.bold, config.selected)}\n`);
}

async function modelsCommand(args, config) {
  const refresh = args.includes('--refresh');
  const showAll = args.includes('--all');
  const wanted = option(args, '--provider', '');
  const providers = PROVIDERS.filter(provider => {
    if (process.env.ORB_DISABLE_LOCAL === '1' && provider.kind === 'local' && !wanted) return false;
    return (!wanted || provider.id === wanted) && (showAll || isConfigured(provider, config));
  });
  if (wanted && !PROVIDER_BY_ID.has(wanted)) throw new Error(`Unknown provider: ${wanted}`);
  const catalog = await availableModels(config, { providers, refresh });
  const rows = providers.flatMap(provider => {
    const models = catalog.get(provider.id) || provider.models;
    if (!models.length) {
      if (!showAll && !wanted) return [];
      return [[provider.id, '—', isConfigured(provider, config) ? 'not running / no models' : `needs ${provider.env}`]];
    }
    return models.map(model => [provider.id, model, routeName(provider.id, model) === config.selected ? 'selected' : (isConfigured(provider, config) ? 'ready' : 'key needed')]);
  });
  table(rows, [{ label: 'PROVIDER' }, { label: 'MODEL' }, { label: 'STATUS' }]);
  if (!showAll) stdout.write(`\n${paint(c.dim, 'Use --all to include providers that need a key.')}\n`);
}

function providersCommand(config) {
  const rows = PROVIDERS.map(provider => [
    isConfigured(provider, config) ? paint(c.green, '●') : paint(c.slate, '○'),
    provider.id, provider.name, provider.badge, provider.free,
  ]);
  table(rows, [{ label: '' }, { label: 'ID' }, { label: 'PROVIDER' }, { label: 'ACCESS' }, { label: 'TERMS' }]);
  stdout.write(`\n${paint(c.dim, '● ready   ○ add the provider API key')}\n`);
}

function signupCommand(args) {
  const provider = PROVIDER_BY_ID.get(args[0]);
  if (!provider) throw new Error(`Unknown provider: ${args[0] || '(missing)'}`);
  if (!provider.signup) throw new Error(`${provider.name} has no signup page.`);
  stdout.write(`${paint(c.bold, provider.name)}\n${provider.signup}\n`);
  if (provider.env) stdout.write(`${paint(c.dim, `then run: orb key set ${provider.id}  ·  env: ${provider.env}`)}\n`);
}

async function routesCommand(config) {
  const routes = await autoRouteCandidates(config, process.env);
  table(routes.map((route, index) => [index + 1, route]), [{ label: 'PRIORITY' }, { label: 'AUTO/FREE ROUTE' }]);
  stdout.write(`\n${paint(c.dim, 'Override with ORB_AUTO_ROUTES=provider/model,provider/model')}\n`);
}

function endpointCommand(args, config) {
  const action = args[0] || 'list';
  if (action === 'list') {
    const rows = PROVIDERS.map(provider => [provider.id, providerBaseUrl(provider, config, process.env) || 'not set']);
    return table(rows, [{ label: 'PROVIDER' }, { label: 'BASE URL' }]);
  }
  const provider = PROVIDER_BY_ID.get(args[1]);
  if (!provider) throw new Error(`Unknown provider: ${args[1] || '(missing)'}`);
  if (action === 'set') {
    const raw = args[2];
    if (!raw) throw new Error('Supply an HTTPS base URL.');
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Endpoint must use HTTP or HTTPS.');
    config.providers[provider.id] = { ...config.providers[provider.id], baseUrl: raw.replace(/\/$/, '') };
    saveConfig(config);
    stdout.write(`${paint(c.green, '✓')} ${provider.id} endpoint saved\n`);
    return;
  }
  if (action === 'remove') {
    delete config.providers[provider.id]?.baseUrl;
    saveConfig(config);
    stdout.write(`${paint(c.green, '✓')} ${provider.id} endpoint reset\n`);
    return;
  }
  throw new Error('Use `orb endpoint list`, `orb endpoint set <provider> <url>`, or `orb endpoint remove <provider>`.');
}

async function keyCommand(args, config) {
  const action = args[0] || 'list';
  if (action === 'list') {
    const rows = PROVIDERS.filter(provider => !provider.keyless || provider.optionalKey).map(provider => [
      provider.id, provider.env, providerKey(provider, config) ? 'configured' : 'missing',
    ]);
    return table(rows, [{ label: 'PROVIDER' }, { label: 'ENVIRONMENT VARIABLE' }, { label: 'STATUS' }]);
  }
  const id = args[1];
  const provider = PROVIDER_BY_ID.get(id);
  if (!provider) throw new Error(`Unknown provider: ${id || '(missing)'}`);
  if (provider.keyless && !provider.optionalKey && action === 'set') throw new Error(`${provider.name} does not require a key.`);
  if (action === 'set') {
    const value = await secretPrompt(`${provider.name} API key`);
    if (!value) throw new Error('Key was empty; nothing changed.');
    config.keys[provider.id] = value;
    saveConfig(config);
    stdout.write(`${paint(c.green, '✓')} saved in ${configPath()} with mode 0600\n`);
    return;
  }
  if (action === 'remove') {
    delete config.keys[provider.id];
    saveConfig(config);
    stdout.write(`${paint(c.green, '✓')} removed ${provider.id} key\n`);
    return;
  }
  throw new Error('Use `orb key list`, `orb key set <provider>`, or `orb key remove <provider>`.');
}

async function doctorCommand(config) {
  const rows = await Promise.all(PROVIDERS.map(async provider => {
    if (!isConfigured(provider, config)) {
      const reason = provider.requiresBaseUrl && !providerBaseUrl(provider, config, process.env) ? 'endpoint not configured' : 'key not configured';
      return [paint(c.slate, '○'), provider.id, reason, providerBaseUrl(provider, config, process.env) || '—'];
    }
    const started = Date.now();
    try {
      const models = await discoverModels(provider, config, { timeout: 6_000 });
      return [paint(c.green, '●'), provider.id, `${models.length} models · ${Date.now() - started}ms`, provider.id === 'auto' ? 'virtual' : providerBaseUrl(provider, config, process.env)];
    } catch (error) {
      return [paint(c.red, '●'), provider.id, error.message.slice(0, 55), providerBaseUrl(provider, config, process.env)];
    }
  }));
  table(rows, [{ label: '' }, { label: 'PROVIDER' }, { label: 'RESULT' }, { label: 'ENDPOINT' }]);
}

async function chatCommand(args, config) {
  const initial = args.filter(value => !value.startsWith('--')).join(' ').trim();
  const interactive = stdin.isTTY && !initial;
  await localDefault(config);
  if (!config.selected) config.selected = interactive ? await chooseModel(config) : 'auto/free';
  if (!loadConfig().selected) saveConfig(config);
  const rl = interactive ? createInterface({ input: stdin, output: stdout }) : null;
  const messages = [];
  logo();
  stdout.write(`${paint(c.dim, config.selected)}${interactive ? paint(c.dim, ' · /model /clear /exit') : ''}\n\n`);
  try {
    let next = initial;
    while (true) {
      if (interactive) next = (await rl.question(`${paint(c.cyan, 'you')}  `)).trim();
      if (!next || next === '/exit' || next === '/quit') break;
      if (next === '/clear') { messages.length = 0; stdout.write(`${paint(c.dim, 'conversation cleared')}\n`); continue; }
      if (next === '/model') {
        rl.close();
        config.selected = await chooseModel(config);
        saveConfig(config);
        stdout.write(`${paint(c.green, '✓')} ${config.selected}\n`);
        return chatCommand([], config);
      }
      messages.push({ role: 'user', content: next });
      stdout.write(`${paint(c.blue, 'orb')}  `);
      let answer = '';
      await streamCompletion({ route: config.selected, messages, config }, text => { answer += text; stdout.write(text); });
      stdout.write('\n\n');
      messages.push({ role: 'assistant', content: answer });
      if (!interactive) break;
    }
  } finally { rl?.close(); }
}

async function serveCommand(args, config) {
  await localDefault(config);
  if (!config.selected) {
    config.selected = 'auto/free';
    saveConfig(config);
  }
  const host = option(args, '--host', '127.0.0.1');
  const port = Number.parseInt(option(args, '--port', '11435'), 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
  const server = await listen(config, { host, port });
  logo();
  stdout.write(`${paint(c.green, '●')} API listening at ${paint(c.bold, `http://${host}:${port}/v1`)}\n`);
  stdout.write(`${paint(c.dim, `model ${config.selected || '(send provider/model in each request)'} · client auth disabled`)}\n`);
  const stop = () => server.close(() => process.exit(0));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (['help', '--help', '-h'].includes(command)) return stdout.write(usage());
  if (command === '--version' || command === '-v') return stdout.write('orb 0.6.0\n');
  const config = loadConfig();
  if (!command) {
    if (!stdin.isTTY) return stdout.write(usage());
    await localDefault(config);
    config.selected = await chooseModel(config);
    saveConfig(config);
    return chatCommand([], config);
  }
  if (command === 'use') return useCommand(args, config);
  if (command === 'models') return modelsCommand(args, config);
  if (command === 'providers') return providersCommand(config);
  if (command === 'signup') return signupCommand(args);
  if (command === 'routes') return routesCommand(config);
  if (command === 'key' || command === 'keys') return keyCommand(args, config);
  if (command === 'endpoint' || command === 'endpoints') return endpointCommand(args, config);
  if (command === 'doctor') return doctorCommand(config);
  if (command === 'chat' || command === 'ask') return chatCommand(args, config);
  if (command === 'serve') return serveCommand(args, config);
  throw new Error(`Unknown command: ${command}\n${usage()}`);
}

main().catch(error => fail(error.message));

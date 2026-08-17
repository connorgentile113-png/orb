import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process, { stdin, stdout } from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PROVIDERS } from './catalog.mjs';
import { saveConfig } from './config.mjs';
import { availableModels, isConfigured } from './client.mjs';
import { rankCodingModels } from './rank.mjs';
import { c, choose, chooseRankedModel, divider, logo, paint, table } from './ui.mjs';

const DEFAULT_PORT = 11435;

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

function codexProfilePath() {
  return path.join(codexHome(), 'orb.config.toml');
}

function codexBinary() {
  return process.env.CODEX_BIN || 'codex';
}

function tomlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function readyCatalog(config) {
  const ready = PROVIDERS.filter(provider => {
    if (process.env.ORB_DISABLE_LOCAL === '1' && provider.kind === 'local') return false;
    return isConfigured(provider, config);
  });
  return availableModels(config, { providers: ready, refresh: true });
}

async function rankShortlist(config, preference) {
  const catalog = await readyCatalog(config);
  const ranked = rankCodingModels(catalog, preference);
  if (!ranked.length) throw new Error('No connected chat models found. Start a local server or add a provider key with `orb key set <provider>`.');
  return ranked.slice(0, 10);
}

async function serverHealthy(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function startServer(port) {
  if (await serverHealthy(port)) return null;
  const bin = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'orb.mjs');
  const child = spawn(process.execPath, [bin, 'serve', '--host', '127.0.0.1', '--port', String(port)], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await serverHealthy(port)) return child;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  try { child.kill('SIGTERM'); } catch { /* already gone */ }
  throw new Error(`The Orb server did not start on port ${port}. Run \`orb serve --port ${port}\` manually to see why.`);
}

function catalogEntry(route) {
  return {
    slug: route,
    display_name: route,
    description: 'Coding model routed through Orb.',
    supported_reasoning_levels: [],
    shell_type: 'default',
    visibility: 'list',
    supported_in_api: true,
    priority: 50,
    availability_nux: null,
    upgrade: null,
    base_instructions: '',
    supports_reasoning_summaries: false,
    support_verbosity: false,
    default_verbosity: null,
    apply_patch_tool_type: 'freeform',
    truncation_policy: { mode: 'tokens', limit: 8192 },
    supports_parallel_tool_calls: true,
    context_window: 128000,
    max_context_window: 128000,
    auto_compact_token_limit: 100000,
    effective_context_window_percent: 95,
    experimental_supported_tools: [],
  };
}

function writeModelCatalog(entries) {
  const target = path.join(codexHome(), 'orb-models.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify({ models: entries.map(entry => catalogEntry(entry.route)) }, null, 2)}\n`, { mode: 0o600 });
  return target;
}

function writeCodexProfile({ baseUrl, route, catalogPath }) {
  const target = codexProfilePath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const profile = [
    `model = "${tomlString(route)}"`,
    'model_provider = "orb"',
    `model_catalog_json = "${tomlString(catalogPath)}"`,
    '',
    '[model_providers.orb]',
    'name = "Orb"',
    `base_url = "${tomlString(`${baseUrl}/v1`)}"`,
    'wire_api = "responses"',
    'requires_openai_auth = false',
    '',
  ].join('\n');
  fs.writeFileSync(target, profile, { mode: 0o600 });
  return target;
}

function runCodex(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(codexBinary(), ['-p', 'orb', ...args], {
      stdio: 'inherit',
      detached: true,
      env: { ...process.env, ...env },
    });
    const forward = signal => { try { child.kill(signal); } catch { /* already gone */ } };
    const cleanup = () => {
      process.removeListener('SIGINT', onSigint);
      process.removeListener('SIGTERM', onSigterm);
    };
    const onSigint = () => forward('SIGINT');
    const onSigterm = () => forward('SIGTERM');
    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);
    child.once('error', error => { cleanup(); reject(error); });
    child.once('exit', (code, signal) => {
      cleanup();
      resolve(signal ? 1 : (code ?? 0));
    });
  });
}

function launchOptions(args) {
  const accuracy = args.includes('--accuracy');
  const cost = args.includes('--cost') || args.includes('--efficient');
  if (accuracy && cost) throw new Error('Choose either --accuracy or --cost, not both.');
  const mode = option(args, '--mode', '');
  if (mode && !['accuracy', 'cost'].includes(mode)) throw new Error('Use --mode accuracy or --mode cost.');
  const port = Number.parseInt(option(args, '--port', String(DEFAULT_PORT)), 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
  const codexArgs = [];
  const separator = args.indexOf('--');
  const remaining = separator >= 0 ? args.slice(separator + 1) : [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--') { codexArgs.push(...remaining); break; }
    if (['--accuracy', '--cost', '--efficient'].includes(args[index])) continue;
    if (args[index] === '--mode' || args[index] === '--port') { index += 1; continue; }
    codexArgs.push(args[index]);
  }
  return { preference: accuracy ? 'accuracy' : cost ? 'cost' : mode, port, codexArgs };
}

export async function launchCommand(args, config) {
  const target = args.shift() || '';
  if (target !== 'codex') {
    throw new Error(`Unsupported launch target: ${target || '(missing)'}. Use \`orb launch codex\`.`);
  }
  const options = launchOptions(args);
  const preference = options.preference || (stdin.isTTY ? await choose('Optimize coding for', [
    { value: 'accuracy', label: 'Maximum accuracy', hint: 'strongest reasoning and coding ability' },
    { value: 'cost', label: 'Cost efficiency', hint: 'free and lightweight routes first' },
  ]) : 'accuracy');
  logo();
  stdout.write(`${paint(c.dim, `Coding model scout for Codex · ${preference === 'accuracy' ? 'maximum accuracy' : 'cost efficiency'}`)}\n`);
  divider();
  stdout.write(`${paint(c.dim, 'Scanning connected providers…')}\n`);
  const shortlist = await rankShortlist(config, preference);
  table(shortlist.map((entry, index) => [
    index + 1, entry.route, entry.score, entry.reasons.join(' · '),
  ]), [{ label: '#' }, { label: 'CODING MODEL' }, { label: 'FIT' }, { label: 'WHY' }]);
  const winner = await chooseRankedModel(shortlist);
  config.selected = winner.route;
  saveConfig(config);
  const baseUrl = `http://127.0.0.1:${options.port}`;
  stdout.write(`\n${paint(c.dim, 'Starting the local Orb API…')}\n`);
  const server = await startServer(options.port);
  if (server) stdout.write(`${paint(c.green, '●')} Orb API listening at ${paint(c.bold, baseUrl)}\n`);
  else stdout.write(`${paint(c.green, '●')} Reusing Orb API already listening at ${paint(c.bold, baseUrl)}\n`);
  const catalogPath = writeModelCatalog(shortlist);
  const profile = writeCodexProfile({ baseUrl, route: winner.route, catalogPath });
  stdout.write(`${paint(c.green, '✓')} Codex profile ${paint(c.bold, profile)}\n`);
  stdout.write(`${paint(c.green, '✓')} Launching Codex with ${paint(c.bold, winner.route)}\n\n`);
  try {
    const exitCode = await runCodex(options.codexArgs, {});
    process.exitCode = exitCode;
  } finally {
    if (server) { try { server.kill('SIGTERM'); } catch { /* already gone */ } }
  }
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CURRENT_VERSION = 1;

export function orbHome(env = process.env) {
  return path.resolve(env.ORB_HOME || path.join(os.homedir(), '.orb'));
}

export function configPath(env = process.env) {
  return path.join(orbHome(env), 'config.json');
}

export function emptyConfig() {
  return { version: CURRENT_VERSION, selected: '', keys: {}, providers: {} };
}

export function loadConfig(env = process.env) {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath(env), 'utf8'));
    return { ...emptyConfig(), ...parsed, keys: { ...parsed.keys }, providers: { ...parsed.providers } };
  } catch (error) {
    if (error.code === 'ENOENT') return emptyConfig();
    throw new Error(`Could not read ${configPath(env)}: ${error.message}`);
  }
}

export function saveConfig(config, env = process.env) {
  const directory = orbHome(env);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const target = configPath(env);
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify({ ...config, version: CURRENT_VERSION }, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, target);
  fs.chmodSync(target, 0o600);
}

export function providerKey(provider, config, env = process.env) {
  return (provider.env && env[provider.env]) || config.keys?.[provider.id] || '';
}

export function providerBaseUrl(provider, config, env = process.env) {
  return String(config.providers?.[provider.id]?.baseUrl || (provider.baseEnv && env[provider.baseEnv]) || provider.baseUrl || '').replace(/\/$/, '');
}

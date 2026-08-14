import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configPath, emptyConfig, loadConfig, providerBaseUrl, saveConfig } from '../src/config.mjs';

test('stores config atomically with private permissions', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const env = { ORB_HOME: directory };
  const config = { ...emptyConfig(), selected: 'ollama/test', keys: { cloud: 'secret' } };
  saveConfig(config, env);
  assert.deepEqual(loadConfig(env), config);
  assert.equal(fs.statSync(configPath(env)).mode & 0o777, 0o600);
});

test('uses a provider endpoint from the supplied environment', () => {
  assert.equal(
    providerBaseUrl({ id: 'account', baseEnv: 'ACCOUNT_URL' }, emptyConfig(), { ACCOUNT_URL: 'https://example.test/v1/' }),
    'https://example.test/v1',
  );
});

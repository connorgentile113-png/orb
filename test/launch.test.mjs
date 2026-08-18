import test from 'node:test';
import assert from 'node:assert/strict';
import { codexProfileToml } from '../src/launch.mjs';

test('codex profile keeps the provider keyless and never forces a login method', () => {
  const toml = codexProfileToml({
    baseUrl: 'http://127.0.0.1:11435',
    route: 'gemini/gemini-3.6-flash',
    catalogPath: '/home/connor/.codex/orb-models.json',
  });
  assert.equal(toml.includes('requires_openai_auth = false'), true);
  assert.equal(toml.includes('forced_login_method'), false);
  assert.equal(toml.includes('env_key'), false);
  assert.equal(toml.includes('wire_api = "responses"'), true);
  assert.equal(toml.includes('model_provider = "orb"'), true);
  assert.equal(toml.includes('base_url = "http://127.0.0.1:11435/v1"'), true);
});

test('codex profile quotes route and catalog paths for TOML', () => {
  const toml = codexProfileToml({
    baseUrl: 'http://127.0.0.1:11435',
    route: 'openrouter/qwen/qwen3-coder:free',
    catalogPath: '/tmp/my "orb" models.json',
  });
  assert.equal(toml.includes('model = "openrouter/qwen/qwen3-coder:free"'), true);
  assert.equal(toml.includes('model_catalog_json = "/tmp/my \\"orb\\" models.json"'), true);
});

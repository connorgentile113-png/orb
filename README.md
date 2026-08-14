# orb

`orb` is a small, direct AI router inspired by OmniRoute. It deliberately has no
OmniRoute account, OAuth callback, dashboard login, session cookie, telemetry,
or local API bearer token. It talks directly to local engines and optional
provider APIs through one clean CLI and an OpenAI-compatible localhost server.

The fastest path is genuinely account-free:

```bash
npm install -g .
orb
```

If Ollama is running, `orb` discovers its installed models and is ready
immediately. This machine currently has `qwen2.5:1.5b`; no cloud signup or key is
needed for it. Keyless cloud routes from LLM7, Kilo Gateway, OpenCode, OVHcloud,
and Pollinations are also discovered automatically; their public quotas and
availability vary.

The v0.8 catalog contains 84 providers, 19 local runtimes, and 571 seeded model
routes. Public model catalogs are refreshed when possible, so the seed list is
only a safe offline starting point.

## Commands

```text
orb                         choose a model and chat
orb chat "hello"            one-shot chat
orb use                     choose the default model
orb use auto/free           use local-first automatic free fallback
orb models --refresh        discover models from ready providers
orb models --all            include providers that need keys
orb providers               show access terms and readiness
orb signup airforce         show the provider key/signup page
orb routes                  show the auto/free fallback order
orb key set groq            securely prompt for a direct API key
orb endpoint set cloudflare https://.../ai/v1
orb doctor                  test provider model endpoints
orb serve --port 11435      expose an auth-free localhost OpenAI API
```

Use `provider/model` anywhere a model is accepted. Model names may contain
slashes, so `github/openai/gpt-4.1-mini` selects the GitHub provider and the
`openai/gpt-4.1-mini` model.

```bash
orb use ollama/qwen2.5:1.5b
orb use openrouter/openrouter/free
orb use auto/free
```

`auto/free` tries the first installed Ollama model, then keyless OpenCode, Kilo,
LLM7, Pollinations, and OVHcloud routes. Set `ORB_AUTO_ROUTES` to a comma-separated
list of `provider/model` routes to customize that order, or set
`ORB_DISABLE_LOCAL=1` to skip Ollama in automatic routing.
When a key is configured, explicit free-only routes from AnyAPI, Api.Airforce,
BazaarLink, Electron Hub, FastRouter, HelyxAI, LiteRouter, MegaNova, NagaAI,
NavyAI, Poixe, Public AI, Routeway, Yolo-Auto, and Zylo are inserted ahead of
the anonymous fallbacks. Providers whose free allowance can spill into metered usage are not added automatically.
BazaarLink requests also send `X-Free-Fallback: false`. Live catalogs are
filtered by explicit free suffix, zero price, plan tier, chat endpoint, and
output modality where the provider exposes those fields.
For non-interactive first use, `orb chat "hello"` automatically selects
`auto/free` when no local model or saved selection exists.

Provider keys can be supplied with the environment variable shown by `orb key
list`, or stored in `~/.orb/config.json`. The file and directory are created with
user-only permissions. Keys are sent only to that provider's configured API
endpoint and are never printed by the CLI.

Providers that permit anonymous free-model access can optionally accept a key to
raise limits. `orb key set kilo`, `orb key set llm7`, and similar commands keep
that optional key in the same private config file.

## Local OpenAI API

```bash
orb serve
curl http://127.0.0.1:11435/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"ollama/qwen2.5:1.5b","messages":[{"role":"user","content":"hello"}]}'
```

Clients may omit `model` after `orb use`. The localhost API intentionally ignores
the `Authorization` header, so tools that insist on a value can use any dummy
string. Browser CORS is not enabled. Bind to the default `127.0.0.1`; exposing an
unauthenticated API on a public interface is unsafe.

## What “free” means

Local inference is free of API usage charges but uses your hardware. Cloud
providers may offer a rate-limited tier or one-time evaluation credits; those
terms can change. `orb providers` distinguishes keyless, free-tier, and
free-credit access, and it never ships somebody else's key or bypasses provider
limits.

The provider-discovery notes and source links live in
[`docs/FREE_PROVIDERS.md`](docs/FREE_PROVIDERS.md).

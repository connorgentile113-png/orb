# orb

<p align="center">
  <img src="https://raw.githubusercontent.com/connorgentile113-png/orb/main/assets/orb-logo.png" alt="Orb logo" width="180">
</p>

One terminal, every model you can access. `orb` discovers local engines and
direct provider APIs, gives you a searchable mouse-friendly model picker, and
opens a focused streaming chat—without an Orb account or OAuth flow.

`orb` is a small, direct AI router inspired by OmniRoute. It deliberately has no
OmniRoute account, OAuth callback, dashboard login, session cookie, telemetry,
or local API bearer token. It talks directly to local engines and optional
provider APIs through one clean CLI and an OpenAI-compatible localhost server.

## Install

Requirements: Node.js 22 or newer. Install from npm on macOS, Linux, or Windows:

```bash
npm install -g orb-ai
orb --version
orb
```

To uninstall:

```bash
npm uninstall -g orb-ai
```

If Ollama is running, `orb` discovers its installed models and is ready
immediately. Keyless cloud routes from LLM7, Kilo Gateway, OpenCode, OVHcloud,
and Pollinations are also discovered automatically; their public quotas and
availability vary.

The v0.13 catalog contains 216 providers, 59 local runtimes, and 822 seeded model
routes. Public model catalogs are refreshed when possible, so the seed list is
only a safe offline starting point.

## Interactive UI

Run `orb` and use the interface directly—no command memorization required.

```text
◆ ORB  interactive model workspace

Select a provider  7/7
⌕ Type to filter…

 › Orb Auto       AUTO · 1 model
   Ollama         LOCAL · 1 model
   Kilo Gateway   KEYLESS · 10 models

↑↓ navigate  Enter select  click an item  Esc cancel
```

- Use `↑`/`↓`, Page Up/Down, Home/End, and Enter.
- Click any provider or model in terminals with mouse reporting support.
- Start typing to filter large provider and model lists immediately.
- Press Backspace to edit the filter or Esc to clear/cancel.
- Model replies render Markdown-style headings, bold/italic text, inline code,
  blockquotes, lists, and fenced code or text blocks directly in the terminal.
- `<thinking>...</thinking>` and `<think>...</think>` sections stay collapsed by
  default. Use `/thinking` to expand or collapse the latest response.
- During chat, use `/model`, `/thinking`, `/clear`, `/help`, or `/exit`.

The main picker intentionally shows models that are usable now. Run `orb
providers` to see every installed integration, or add a key with `orb key set
<provider>` and it will appear automatically.

## Commands

```text
orb                         choose a model and chat
orb chat "hello"            one-shot chat
orb code                    rank connected coding models and chat
orb code --accuracy         prioritize coding quality and reasoning
orb code --cost             prioritize free and efficient coding routes
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
orb launch codex            rank coding models and open Codex CLI
```

`orb code` refreshes every connected provider, ranks its chat models for coding,
prints a ten-model shortlist with scoring reasons, and asks you to confirm the
#1 pick or type a number to choose any model in the list before entering chat. With no flag it asks whether to optimize
for maximum accuracy or cost efficiency. Use `--list` to rank and select without
starting a conversation, or include a prompt for a one-shot coding request:

```bash
orb code --accuracy "review this function"
orb code --cost --list
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

## Launch into Codex

<p align="center">
  <img src="https://raw.githubusercontent.com/connorgentile113-png/orb/main/assets/codex-logo.png" alt="OpenAI Codex logo" width="140">
</p>

Orb now ships with Codex CLI support. `orb launch codex` ranks every connected
coding model (the same scoring as `orb code`), prints the ten-model shortlist,
and asks you to confirm the #1 pick or type a number to choose any model in the
list. It then starts the local Orb API, writes a Codex profile, and opens the
Codex CLI against the chosen model:

```bash
orb launch codex                 # ask accuracy vs cost, then launch
orb launch codex --accuracy      # strongest coding model first
orb launch codex --cost          # free and efficient routes first
orb launch codex --port 11436    # run the Orb API on a different port
```

Codex 0.122+ removed the chat-completions wire API, so `orb serve` exposes a
`/v1/responses` endpoint that translates the Responses API into Orb's provider
calls. The Codex profile is written to `~/.codex/orb.config.toml` (or
`$CODEX_HOME/orb.config.toml`) and is launched with `codex -p orb`. Anything
after `--` is forwarded to Codex, for example `orb launch codex -- -C ~/my-project`.

The local Orb API ignores client auth, so the profile disables OpenAI auth
(`requires_openai_auth = false`) and Codex sends no key. Direct
Anthropic-protocol providers stream text but do not surface tool calls through
Codex; to use Claude in Codex, connect it through an OpenAI-compatible provider
such as OpenRouter.

## Local OpenAI API

Start Orb's OpenAI-compatible server:

```bash
orb serve
```

It listens on `http://127.0.0.1:11435` by default. Use a different local port
with `orb serve --port 8080`.

### API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check server status and see the selected default model. |
| `GET` | `/v1/models` | List every model currently available from connected providers. |
| `POST` | `/v1/chat/completions` | Create a standard or streaming chat completion. |
| `POST` | `/v1/responses` | Responses API used by the Codex CLI (chat and streaming, with tool calls). |

### Check status and the selected model

```bash
curl http://127.0.0.1:11435/health
```

Example response:

```json
{
  "ok": true,
  "service": "orb",
  "auth": false,
  "selected": "ollama/qwen2.5:1.5b"
}
```

### List available models

```bash
curl http://127.0.0.1:11435/v1/models
```

Every returned `id` is a complete `provider/model` route that can be copied
directly into a chat request:

```json
{
  "object": "list",
  "data": [
    {
      "id": "ollama/qwen2.5:1.5b",
      "object": "model",
      "owned_by": "ollama"
    }
  ]
}
```

### Select a model

Set the server's persistent default before starting it:

```bash
orb use ollama/qwen2.5:1.5b
orb serve
```

You can omit `model` from requests after using `orb use`. To select or override
the model for one request, send any ID returned by `/v1/models`:

```bash
curl http://127.0.0.1:11435/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{
    "model": "ollama/qwen2.5:1.5b",
    "messages": [
      {"role": "system", "content": "Answer concisely."},
      {"role": "user", "content": "Hello"}
    ],
    "temperature": 0.2,
    "stream": false
  }'
```

The response uses the OpenAI chat-completion shape. When the upstream provider
reports token counts, they are available in `usage`:

```json
{
  "choices": [
    {"message": {"role": "assistant", "content": "Hello!"}}
  ],
  "usage": {
    "prompt_tokens": 18,
    "completion_tokens": 3,
    "total_tokens": 21
  }
}
```

Usage values come from the selected provider. Some providers, especially free
or streaming routes, may omit them or report them only in the final event.

### Stream a response

```bash
curl -N http://127.0.0.1:11435/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{
    "model": "auto/free",
    "messages": [{"role": "user", "content": "Write a short greeting"}],
    "stream": true
  }'
```

Streaming uses Server-Sent Events and ends with `data: [DONE]`. When
`auto/free` chooses a route, Orb returns the selected `provider/model` in the
`X-Orb-Route` response header.

The request body currently accepts `model`, `messages`, `stream`, and
`temperature`. The localhost API intentionally ignores the `Authorization`
header, so OpenAI clients that require a key can use any dummy value. Browser
CORS is not enabled. Keep the default `127.0.0.1` binding; exposing this
unauthenticated API on a public interface is unsafe.

## What “free” means

Local inference is free of API usage charges but uses your hardware. Cloud
providers may offer a rate-limited tier or one-time evaluation credits; those
terms can change. `orb providers` distinguishes keyless, free-tier, and
free-credit access, and it never ships somebody else's key or bypasses provider
limits.

The provider-discovery notes and source links live in
[`docs/FREE_PROVIDERS.md`](docs/FREE_PROVIDERS.md).

## Development

```bash
npm test
npm run check
npm pack --dry-run
```

The test suite covers provider safety, routing, coding-model ranking, rich
response formatting, responsive tables, keyboard navigation, live filtering,
and mouse selection. GitHub Actions runs the same checks on pushes and pull
requests.

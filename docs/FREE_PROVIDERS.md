# Free provider research

Checked 2026-08-14. “Free” here means one of: no-key community access,
self-replenishing free quota, selected zero-priced models, or explicitly labeled
evaluation credit. It never means bundled/shared keys, disposable accounts, or
bypassing a provider’s limits.

## GitHub lists reviewed

- [xyzs996/free-llm-api](https://github.com/xyzs996/free-llm-api) — recent,
  source-linked catalog that separates permanent tiers, trials, and retired
  offers. This was the main discovery source.
- [cheahjs/free-llm-api-resources](https://github.com/cheahjs/free-llm-api-resources)
  — long-running list that explicitly excludes reverse-engineered chatbot access.
- [amardeeplakshkar/awesome-free-llm-apis](https://github.com/amardeeplakshkar/awesome-free-llm-apis)
  — compatibility and model cross-check.
- [pollinations/pollinations](https://github.com/pollinations/pollinations) —
  provider-owned API implementation and documentation.

## Added to orb

| Provider | orb ID | Access included | OpenAI base URL |
|---|---|---|---|
| Ollama | `ollama` | local, keyless | `http://127.0.0.1:11434/v1` |
| llama.cpp | `llamacpp` | local, keyless | `http://127.0.0.1:8080/v1` |
| Pollinations legacy community endpoint | `pollinations` | keyless, rate-limited | `https://text.pollinations.ai/openai` |
| Google Gemini | `gemini` | free tier | `https://generativelanguage.googleapis.com/v1beta/openai` |
| GroqCloud | `groq` | free tier | `https://api.groq.com/openai/v1` |
| SambaNova Cloud | `sambanova` | free tier | `https://api.sambanova.ai/v1` |
| Cohere | `cohere` | free evaluation key | `https://api.cohere.ai/compatibility/v1` |
| Cloudflare Workers AI | `cloudflare` | daily free allocation | account-specific |
| Hugging Face | `huggingface` | monthly free credits | `https://router.huggingface.co/v1` |
| SiliconFlow | `siliconflow` | selected free models/tier | `https://api.siliconflow.com/v1` |
| Fireworks AI | `fireworks` | limited no-payment access | `https://api.fireworks.ai/inference/v1` |
| Z.AI | `zai` | zero-priced Flash models | `https://api.z.ai/api/paas/v4` |
| Novita AI | `novita` | selected zero-priced models | `https://api.novita.ai/openai` |
| Mistral | `mistral` | experiment tier | `https://api.mistral.ai/v1` |
| Alibaba Model Studio | `dashscope` | model-dependent free quota | regional endpoint |
| Moonshot AI | `moonshot` | model-dependent free quota | `https://api.moonshot.ai/v1` |
| OpenRouter | `openrouter` | models ending in `:free` | `https://openrouter.ai/api/v1` |
| NVIDIA NIM | `nvidia` | evaluation allowance | `https://integrate.api.nvidia.com/v1` |
| Chutes | `chutes` | community tier | `https://llm.chutes.ai/v1` |

GitHub Models remains in the catalog for compatibility but is marked `FREE
RETIRED`: the reviewed catalog records retirement of its free tier on
2026-07-30. Cerebras is marked `TRIAL`, not permanent free, because current
access requires payment verification.

## Primary documentation cross-checks

- [Google Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Groq rate limits](https://console.groq.com/docs/rate-limits)
- [Cohere compatibility API](https://docs.cohere.com/docs/compatibility-api)
  and [evaluation-key limits](https://docs.cohere.com/v2/docs/rate-limits)
- [Cloudflare OpenAI compatibility](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/)
- [Fireworks OpenAI compatibility](https://docs.fireworks.ai/tools-sdks/openai-compatibility)
- [Z.AI pricing](https://docs.z.ai/guides/overview/pricing)
- [Alibaba regional base URLs](https://www.alibabacloud.com/help/en/model-studio/base-url)
- [Pollinations API docs](https://github.com/pollinations/pollinations/blob/main/APIDOCS.md)

Free tiers change. `orb doctor` probes only providers for which the user has
configured a key; it does not claim that a successful model-list request proves
remaining quota.

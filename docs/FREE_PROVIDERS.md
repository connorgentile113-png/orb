# Free provider research

Checked 2026-08-14. “Free” here means one of: no-key community access,
self-replenishing free quota, selected zero-priced models, or explicitly labeled
evaluation credit. It never means bundled/shared keys, disposable accounts, or
bypassing a provider’s limits.

## GitHub lists reviewed

- [xyzs996/free-llm-api](https://github.com/xyzs996/free-llm-api) — recent,
  source-linked catalog that separates permanent tiers, trials, and retired
  offers. This was the main discovery source.
- [amardeeplakshkar/awesome-free-llm-apis](https://github.com/amardeeplakshkar/awesome-free-llm-apis)
  — compatibility and model cross-check.
- [pollinations/pollinations](https://github.com/pollinations/pollinations) —
  provider-owned API implementation and documentation.
- [open-free-llm-api/awesome-freellm-apis](https://github.com/open-free-llm-api/awesome-freellm-apis)
  — machine-updated endpoint and model cross-check used for the second provider
  round.
- [velo4705/awesome-free-byok-models](https://github.com/velo4705/awesome-free-byok-models)
  — current free-model suffixes and small-provider discovery.
- [OmniRoute Free Tiers wiki](https://github.com/diegosouzapw/OmniRoute/wiki/Free-Tiers)
  — broad recurring-quota and terms-of-service audit used to find the third
  provider round.

## Added to orb

| Provider | orb ID | Access included | OpenAI base URL |
|---|---|---|---|
| Orb Auto | `auto` | local-first keyless fallback | virtual route |
| Ollama | `ollama` | local, keyless | `http://127.0.0.1:11434/v1` |
| llama.cpp | `llamacpp` | local, keyless | `http://127.0.0.1:8080/v1` |
| LM Studio | `lmstudio` | local, keyless | `http://127.0.0.1:1234/v1` |
| vLLM | `vllm` | local, keyless | `http://127.0.0.1:8000/v1` |
| LocalAI | `localai` | local, keyless | `http://127.0.0.1:8080/v1` |
| Jan | `jan` | local, keyless | `http://127.0.0.1:1337/v1` |
| KoboldCpp | `koboldcpp` | local, keyless | `http://127.0.0.1:5001/v1` |
| GPT4All | `gpt4all` | local, keyless | `http://127.0.0.1:4891/v1` |
| Text Generation WebUI | `textgen` | local, keyless | `http://127.0.0.1:5000/v1` |
| llama-swap | `llama-swap` | local, keyless | `http://127.0.0.1:8080/v1` |
| SGLang | `sglang` | local, keyless | `http://127.0.0.1:30000/v1` |
| Aphrodite Engine | `aphrodite` | local, keyless | `http://127.0.0.1:2242/v1` |
| MLX LM | `mlx-lm` | local, keyless | `http://127.0.0.1:8080/v1` |
| TabbyAPI | `tabbyapi` | local, optional key | `http://127.0.0.1:5000/v1` |
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
| Chutes | `chutes` | metered optional provider | `https://llm.chutes.ai/v1` |
| ModelScope | `modelscope` | daily free request allowance | `https://api-inference.modelscope.cn/v1` |
| Ollama Cloud | `ollama-cloud` | free-plan session/weekly limits | native `https://ollama.com/api` |
| LLM7 | `llm7` | keyless quota; optional free token | `https://api.llm7.io/v1` |
| OVHcloud AI Endpoints | `ovh` | anonymous rate-limited access | `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1` |
| Kilo Gateway | `kilo` | keyless `:free` routes | `https://api.kilo.ai/api/gateway` |
| OpenCode Free Gateway | `opencode` | documented no-key chat models | `https://console.opencode.ai/inference/openai/v1` |
| Aion Labs | `aion` | rate-limited free account | `https://api.aionlabs.ai/v1` |
| Agnes AI | `agnes` | rate-limited free account | `https://apihub.agnes-ai.com/v1` |
| GLHF.chat | `glhf` | community-hosted free models | `https://glhf.chat/api/openai/v1` |
| AI21 Labs | `ai21` | limited developer tier | `https://api.ai21.com/studio/v1` |
| Nscale | `nscale` | fair-use inference | `https://inference.api.nscale.com/v1` |
| Nebius AI Studio | `nebius` | account credits | `https://api.studio.nebius.com/v1` |
| xAI | `xai` | eligibility-dependent credits | `https://api.x.ai/v1` |
| Vercel AI Gateway | `vercel` | $5 monthly gateway credits | `https://ai-gateway.vercel.sh/v1` |
| Api.Airforce | `airforce` | explicit zero-cost model routes | `https://api.airforce/v1` |
| BazaarLink | `bazaarlink` | per-model daily free quota | `https://bazaarlink.ai/api/v1` |
| LiteRouter | `literouter` | free-suffixed models | `https://api.literouter.com/v1` |
| LLM.kiwi | `llm-kiwi` | no-card free account | `https://api.llm.kiwi/v1` |
| Public AI Gateway | `publicai` | public-interest free tier | `https://api.publicai.co/v1` |
| Morph | `morph` | 200 free requests/month | `https://api.morphllm.com/v1` |
| Ant Ling | `ant-ling` | 500K tokens/day | `https://api.ant-ling.com/v1` |
| AnyAPI AI | `anyapi` | 100K anyTokens/day on explicit free models | `https://api.anyapi.ai/v1` |
| FastRouter | `fastrouter` | zero-priced `:free` routes | `https://api.fastrouter.ai/api/v1` |
| Routeway | `routeway` | 5 RPM / 200 RPD `:free` routes | `https://api.routeway.ai/v1` |
| NagaAI | `naga` | zero-priced `:free` chat routes | `https://api.naga.ac/v1` |
| Poixe AI | `poixe` | daily-reset `:free` chat quotas | `https://api.poixe.com/v1` |
| MegaNova | `meganova` | tier-1 models with daily limits | `https://inference.meganova.ai/v1` |
| Zylo AI | `zylo` | zero-priced Basic-plan models | `https://api.zyloai.net/v1` |
| VoidAI | `voidai` | 125K credits/day | `https://api.voidai.app/v1` |
| Poolside | `poolside` | limited-time Laguna preview | `https://inference.poolside.ai/v1` |
| Mixlayer | `mixlayer` | explicit free Qwen route | `https://models.mixlayer.ai/v1` |
| Electron Hub | `electronhub` | 25 explicit `:free` routes | `https://api.electronhub.ai/v1` |
| NavyAI | `navy` | 150K weighted tokens/day | `https://api.navy/v1` |
| HelyxAI | `helyx` | 2M tokens/day, no paid tier | `https://helyxai.space/v1` |
| Yolo-Auto | `yolo-auto` | card-free daily Qwen requests | `https://yolo-auto.com/v1` |
| FreeInference | `freeinference` | research-community free service | `https://freeinference.org/v1` |
| MNN AI | `mnn` | one monthly free credit | `https://api.mnnai.ru/v1` |
| Speka | `speka` | $1 model usage/month | `https://speka.me/v1` |
| Intern AI | `intern-ai` | research-oriented free allowance | `https://chat.intern-ai.org.cn/api/v1` |
| LongCat | `longcat` | one-time evaluation grant | `https://api.longcat.chat/openai/v1` |
| Reka | `reka` | metered; free account only | `https://api.reka.ai/v1` |

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
- [Kilo anonymous gateway access](https://github.com/Kilo-Org/kilocode/blob/main/packages/kilo-docs/pages/gateway/authentication.md)
- [OpenCode free chat models](https://console.opencode.ai/guides)
- [Ollama cloud and API-key behavior](https://docs.ollama.com/cloud)
- [Vercel AI Gateway free-tier credits](https://vercel.com/docs/ai-gateway/pricing)
- [Vercel OpenAI-compatible REST API](https://vercel.com/docs/ai-gateway/openai-compat/rest-api)
- [Chutes current pay-per-token pricing](https://chutes.ai/pricing)
- [Api.Airforce quickstart and free-plan limits](https://api.airforce/docs/quickstart/)
  and [free model identifiers](https://api.airforce/docs/api/models/)
- [BazaarLink free-model rules](https://bazaarlink.ai/docs)
- [LiteRouter API and free-suffix behavior](https://literouter.com/api_docs)
- [LLM.kiwi OpenAI-compatible API](https://llm.kiwi/docs)
- [Public AI API setup and rate limits](https://platform.publicai.co/docs)
- [Morph monthly allowance and model pricing](https://www.morphllm.com/pricing)
- [Ant Ling recurring allowance](https://developer.ant-ling.com/en/docs/models/price/)
- [AnyAPI quickstart](https://docs.anyapi.ai/get-started/quick-start),
  [pricing](https://anyapi.ai/pricing), and [terms](https://anyapi.ai/terms-of-service)
- [FastRouter public model API](https://docs.fastrouter.ai/api-reference/models)
- [Routeway free-model rules](https://docs.routeway.ai/getting-started/models)
  and [rate limits](https://docs.routeway.ai/getting-started/rate-limits)
- [NagaAI API reference](https://docs.naga.ac/api-reference/overview)
- [Poixe free-model limits](https://poixe.com/products/free) and
  [model suffix rules](https://docs.poixe.com/cn/api-reference/introduction/model-naming)
- [MegaNova free model list](https://docs.meganova.ai/inference-models/model-list)
  and [OpenAI-compatible endpoint](https://docs.meganova.ai/)
- [Zylo Basic plan and endpoint](https://zyloai.net/)
- [VoidAI free plan](https://voidai.app/pricing) and
  [quickstart](https://docs.voidai.app/quickstart)
- [Poolside model preview](https://poolside.ai/models)
- [Electron Hub free-model access](https://docs.electronhub.ai/billing/model-access)
  and [daily Neutrinos](https://docs.electronhub.ai/billing/credits)
- [NavyAI free-plan pricing](https://api.navy/) and
  [public model metadata](https://api.navy/docs/models)
- [HelyxAI free API](https://helyxai.space/)
- [Yolo-Auto free API](https://yolo-auto.com/free-ai-chat) and
  [current model list](https://yolo-auto.com/models)
- [FreeInference documentation](https://doc.freeinference.org/) and
  [service disclosure](https://freeinference.org/)
- [MNN API, tiers, and limits](https://mnnai.ru/docs)
- [Speka free plan](https://speka.me/pricing)
- [Intern AI authentication](https://internlm.intern-ai.org.cn/docEn/docs/Authentication/)
- [LongCat API overview](https://longcat.chat/platform/docs/APIDocs.html)
- [Reka API quickstart](https://docs.reka.ai/quickstart) and
  [current metered pricing](https://docs.reka.ai/pricing)
- [GPT4All local API server](https://github.com/nomic-ai/gpt4all/wiki/Local-API-Server)
- [llama-swap OpenAI-compatible endpoints](https://github.com/mostlygeek/llama-swap)
- [SGLang quickstart](https://github.com/sgl-project/sglang/blob/main/docs_new/docs/get-started/quickstart.mdx)
- [Aphrodite OpenAI server](https://aphrodite.pygmalion.chat/usage/1-getting-started/)
- [MLX LM HTTP server](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/SERVER.md)
- [TabbyAPI usage and authentication](https://github.com/theroyallab/tabbyAPI/wiki/03.-Usage)

Free tiers change. `orb doctor` probes only providers for which the user has
configured a key; it does not claim that a successful model-list request proves
remaining quota.

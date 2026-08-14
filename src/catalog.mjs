export const PROVIDERS = Object.freeze([
  {
    id: 'ollama', name: 'Ollama', badge: 'LOCAL', kind: 'local', keyless: true,
    baseUrl: 'http://127.0.0.1:11434/v1', modelsUrl: 'http://127.0.0.1:11434/api/tags',
    env: null, signup: 'https://ollama.com/download',
    free: 'Runs on your machine; no account, key, or usage charge.',
    models: ['qwen2.5:1.5b'],
  },
  {
    id: 'llamacpp', name: 'llama.cpp', badge: 'LOCAL', kind: 'local', keyless: true,
    baseUrl: 'http://127.0.0.1:8080/v1', env: null,
    signup: 'https://github.com/ggml-org/llama.cpp',
    free: 'Runs on your machine; no account, key, or usage charge.', models: [],
  },
  {
    id: 'pollinations', name: 'Pollinations', badge: 'KEYLESS', kind: 'community', keyless: true,
    baseUrl: 'https://text.pollinations.ai/openai', env: 'POLLINATIONS_API_KEY',
    signup: 'https://enter.pollinations.ai',
    free: 'Keyless community access is rate-limited; an optional key raises limits.',
    models: ['openai-fast'],
  },
  {
    id: 'github', name: 'GitHub Models', badge: 'FREE RETIRED', kind: 'cloud', keyless: false,
    baseUrl: 'https://models.github.ai/inference', env: 'GITHUB_TOKEN',
    signup: 'https://github.com/marketplace/models',
    free: 'The free tier retired July 30, 2026; kept for accounts that still have API access.',
    models: ['openai/gpt-4.1-mini', 'openai/gpt-4o-mini', 'deepseek/DeepSeek-V3-0324', 'meta/Llama-4-Scout-17B-16E-Instruct'],
  },
  {
    id: 'openrouter', name: 'OpenRouter', badge: 'FREE MODELS', kind: 'cloud', keyless: false,
    baseUrl: 'https://openrouter.ai/api/v1', env: 'OPENROUTER_API_KEY',
    signup: 'https://openrouter.ai/settings/keys',
    free: 'Models ending in :free have separate rate limits and no token charge.',
    models: ['openrouter/free', 'deepseek/deepseek-r1-0528:free', 'qwen/qwen3-coder:free', 'meta-llama/llama-3.3-70b-instruct:free'],
  },
  {
    id: 'groq', name: 'GroqCloud', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.groq.com/openai/v1', env: 'GROQ_API_KEY',
    signup: 'https://console.groq.com/keys',
    free: 'Developer plan has published per-model rate limits.',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
  },
  {
    id: 'cerebras', name: 'Cerebras Inference', badge: 'TRIAL', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.cerebras.ai/v1', env: 'CEREBRAS_API_KEY',
    signup: 'https://cloud.cerebras.ai',
    free: 'Currently trial credit and payment verification, not a permanent card-free tier.',
    models: ['llama3.1-8b', 'gpt-oss-120b', 'qwen-3-32b'],
  },
  {
    id: 'gemini', name: 'Google Gemini', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', env: 'GEMINI_API_KEY',
    signup: 'https://aistudio.google.com/app/apikey',
    free: 'Google AI Studio offers a rate-limited free tier in supported regions.',
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-27b-it'],
  },
  {
    id: 'mistral', name: 'Mistral La Plateforme', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.mistral.ai/v1', env: 'MISTRAL_API_KEY',
    signup: 'https://console.mistral.ai/api-keys',
    free: 'Experiment plan is rate-limited and may require account verification.',
    models: ['mistral-small-latest', 'open-mistral-nemo', 'codestral-latest'],
  },
  {
    id: 'nvidia', name: 'NVIDIA NIM', badge: 'FREE CREDITS', kind: 'cloud', keyless: false,
    baseUrl: 'https://integrate.api.nvidia.com/v1', env: 'NVIDIA_API_KEY',
    signup: 'https://build.nvidia.com',
    free: 'Developer API access includes a limited evaluation allowance.',
    models: ['meta/llama-3.1-8b-instruct', 'deepseek-ai/deepseek-r1', 'qwen/qwen3-coder-480b-a35b-instruct'],
  },
  {
    id: 'sambanova', name: 'SambaNova Cloud', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.sambanova.ai/v1', env: 'SAMBANOVA_API_KEY',
    signup: 'https://cloud.sambanova.ai/apis',
    free: 'Free developer access is rate-limited.',
    models: ['Meta-Llama-3.3-70B-Instruct', 'DeepSeek-R1', 'Qwen3-32B'],
  },
  {
    id: 'huggingface', name: 'Hugging Face Inference', badge: 'FREE CREDITS', kind: 'cloud', keyless: false,
    baseUrl: 'https://router.huggingface.co/v1', env: 'HF_TOKEN',
    signup: 'https://huggingface.co/settings/tokens',
    free: 'Free accounts receive a small monthly inference allowance.',
    models: ['meta-llama/Llama-3.1-8B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct', 'deepseek-ai/DeepSeek-R1:fastest'],
  },
  {
    id: 'siliconflow', name: 'SiliconFlow', badge: 'FREE CREDITS', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.siliconflow.com/v1', env: 'SILICONFLOW_API_KEY',
    signup: 'https://cloud.siliconflow.com/account/ak',
    free: 'New accounts may receive promotional balance; terms can change.',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'deepseek-ai/DeepSeek-V3', 'THUDM/GLM-4-9B-0414'],
  },
  {
    id: 'chutes', name: 'Chutes', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: 'https://llm.chutes.ai/v1', env: 'CHUTES_API_KEY',
    signup: 'https://chutes.ai',
    free: 'Community inference availability and limits vary by deployment.',
    models: ['deepseek-ai/DeepSeek-V3-0324', 'Qwen/Qwen3-32B', 'unsloth/gemma-3-27b-it'],
  },
  {
    id: 'cohere', name: 'Cohere', badge: 'FREE EVAL', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.cohere.ai/compatibility/v1', env: 'COHERE_API_KEY',
    signup: 'https://dashboard.cohere.com/api-keys',
    free: 'Evaluation keys are free, limited to 1,000 calls/month and per-model RPM limits.',
    models: ['command-a-plus-05-2026', 'command-a-03-2025', 'command-r-plus', 'command-r7b-12-2024'],
  },
  {
    id: 'cloudflare', name: 'Cloudflare Workers AI', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: '', baseEnv: 'CLOUDFLARE_AI_BASE_URL', requiresBaseUrl: true, env: 'CLOUDFLARE_API_TOKEN',
    signup: 'https://dash.cloudflare.com/profile/api-tokens',
    free: 'Daily Workers AI allocation; set the account-specific OpenAI endpoint with `orb endpoint set cloudflare`.',
    models: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/openai/gpt-oss-120b', '@cf/qwen/qwen2.5-coder-32b-instruct'],
  },
  {
    id: 'fireworks', name: 'Fireworks AI', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.fireworks.ai/inference/v1', env: 'FIREWORKS_API_KEY',
    signup: 'https://app.fireworks.ai/settings/users/api-keys',
    free: 'Selected access without a payment method is account-wide rate-limited.',
    models: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/gpt-oss-120b'],
  },
  {
    id: 'zai', name: 'Z.AI Open Platform', badge: 'FREE MODELS', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.z.ai/api/paas/v4', env: 'ZAI_API_KEY',
    signup: 'https://z.ai/manage-apikey/apikey-list',
    free: 'Flash model input, output, and cache pricing is published as free.',
    models: ['glm-4.7-flash', 'glm-4.5-flash', 'glm-4.6v-flash'],
  },
  {
    id: 'novita', name: 'Novita AI', badge: 'FREE MODELS', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.novita.ai/openai', env: 'NOVITA_API_KEY',
    signup: 'https://novita.ai/settings/key-management',
    free: 'Selected models are priced at zero; provider does not publish one global quota.',
    models: ['inclusionai/Ling-3.0-flash', 'moonshotai/kimi-k2-instruct-0905'],
  },
  {
    id: 'dashscope', name: 'Alibaba Model Studio', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1', env: 'DASHSCOPE_API_KEY',
    signup: 'https://bailian.console.alibabacloud.com/',
    free: 'Model-dependent free quotas; endpoint and key must belong to the same region.',
    models: ['qwen3.6-flash', 'qwen-plus', 'qwen-turbo', 'qwen3-coder-plus'],
  },
  {
    id: 'moonshot', name: 'Moonshot AI', badge: 'FREE TIER', kind: 'cloud', keyless: false,
    baseUrl: 'https://api.moonshot.ai/v1', env: 'MOONSHOT_API_KEY',
    signup: 'https://platform.moonshot.ai/console/api-keys',
    free: 'Model-dependent account quota; no card required by the reviewed provider list.',
    models: ['kimi-k2-0905-preview', 'moonshot-v1-8k', 'moonshot-v1-128k'],
  },
]);

export const PROVIDER_BY_ID = new Map(PROVIDERS.map(provider => [provider.id, provider]));

export function parseRoute(value) {
  const route = String(value || '').trim();
  const slash = route.indexOf('/');
  if (slash < 1) return { providerId: null, model: route };
  const providerId = route.slice(0, slash).toLowerCase();
  return PROVIDER_BY_ID.has(providerId)
    ? { providerId, model: route.slice(slash + 1) }
    : { providerId: null, model: route };
}

export function routeName(providerId, model) {
  return `${providerId}/${model}`;
}

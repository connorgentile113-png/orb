import { PROVIDERS, routeName } from './catalog.mjs';

const QUALITY_RULES = Object.freeze([
  { pattern: /gpt[-_.]?5[._-]?6[-_.]?sol|claude.*opus.*4[._-]?8/i, score: 100, reason: 'frontier agentic coding model' },
  { pattern: /gpt[-_.]?5[._-]?6[-_.]?terra/i, score: 98, reason: 'frontier coding model' },
  { pattern: /claude.*sonnet.*4[._-]?6/i, score: 96, reason: 'top-tier agentic coding model' },
  { pattern: /gpt[-_.]?5[._-]?6[-_.]?luna/i, score: 94, reason: 'fast frontier coding model' },
  { pattern: /claude.*(?:fable|mythos)[-_. ]5(?:\b|[-_.])/i, score: 100, reason: 'frontier agentic model' },
  { pattern: /claude.*opus[-_. ]5(?:\b|[-_.])|gpt[-_.]?5[._-]?(?:4|5|6).*codex/i, score: 98, reason: 'frontier coding model' },
  { pattern: /gpt[-_.]?5[._-]?3.*codex|claude.*sonnet[-_. ]5(?:\b|[-_.])/i, score: 96, reason: 'top-tier coding model' },
  { pattern: /gpt[-_.]?5(?:[._-]?4)?(?:\b|[-_])|claude.*opus|(?:^|[/_-])o3(?:\b|[-_])/i, score: 93, reason: 'flagship reasoning model' },
  { pattern: /claude.*sonnet.*4[._-]?5|deepseek.*v4.*pro/i, score: 90, reason: 'strong coding and reasoning model' },
  { pattern: /kimi.*k2[._-]?7.*code|qwen3.*coder.*(?:480|next)|gpt[-_.]?oss[-_.]?120b/i, score: 88, reason: 'large coding-capable model' },
  { pattern: /laguna|qwen.*coder|codex|codestral|devstral|mistral.*code|north.*code/i, score: 85, reason: 'coding-specialized model' },
  { pattern: /deepseek.*v4.*flash|claude.*haiku.*4[._-]?5|mimo.*2[._-]?5|nemotron.*ultra/i, score: 82, reason: 'high-quality efficient model' },
  { pattern: /qwen3[._-]?6.*35b|qwen3[._-]?6.*27b|step.*3[._-]?7|deepseek|reasoner/i, score: 78, reason: 'strong general reasoning model' },
  { pattern: /gpt[-_.]?oss[-_.]?20b|qwen3.*32b|gemma.*31b|llama.*70b|big[-_.]?pickle/i, score: 74, reason: 'capable general model' },
  { pattern: /flash|mini|small|nano|(?:^|[/_-])(?:7|8|12|20)b(?:\b|[-_])/i, score: 60, reason: 'lightweight model' },
]);

const NON_CHAT = /guard|embed|rerank|whisper|stable-diffusion|image-|audio|voice|suno|kling|veo|banana/i;
const CODING_SIGNAL = /code|coder|codex|codestral|devstral|program|software|laguna|north/i;
const REASONING_SIGNAL = /reason|think|r1|o[134](?:\b|[-_])|opus|pro/i;
const EFFICIENT_SIGNAL = /haiku|mini|nano|flash|lite|small|instant|(?:^|[/_-])(?:1|2|3|4|7|8|12|20)b(?:\b|[-_])/i;
const LARGE_SIGNAL = /opus|ultra|pro|(?:^|[/_-])(?:120|235|397|480|550|671)b(?:\b|[-_])/i;

function qualityFor(model) {
  const match = QUALITY_RULES.find(rule => rule.pattern.test(model));
  let score = match?.score || 45;
  const reasons = [match?.reason || 'general-purpose model'];
  if (CODING_SIGNAL.test(model) && !/coding-specialized|coding model/.test(reasons[0])) {
    score += 6;
    reasons.push('coding signal');
  }
  if (REASONING_SIGNAL.test(model) && !/reasoning/.test(reasons[0])) {
    score += 3;
    reasons.push('reasoning signal');
  }
  return { score: Math.min(100, score), reasons };
}

function economyFor(provider, model) {
  const badge = String(provider.badge || '').toUpperCase();
  const explicitFree = /:free(?:\b|:)|-free(?:\b|[-_])|openrouter\/free/i.test(model);
  let score;
  let reason;
  if (provider.kind === 'local') {
    score = 100;
    reason = 'local, no usage fee';
  } else if (explicitFree) {
    score = 96;
    reason = 'explicit free route';
  } else if (provider.keyless) {
    score = 92;
    reason = 'anonymous quota';
  } else if (badge === 'FREE MODELS' || badge === 'FREE MODEL') {
    score = 88;
    reason = 'zero-priced model tier';
  } else if (badge === 'FREE TIER' || badge === 'FREE EVAL') {
    score = 74;
    reason = 'provider free allowance';
  } else if (/FREE|PREVIEW|TRIAL/.test(badge)) {
    score = 55;
    reason = 'limited credits or preview';
  } else {
    score = 24;
    reason = 'metered access';
  }
  if (EFFICIENT_SIGNAL.test(model)) score += 6;
  if (LARGE_SIGNAL.test(model)) score -= 7;
  return { score: Math.max(0, Math.min(100, score)), reason };
}

export function rankCodingModels(catalog, preference = 'accuracy', providers = PROVIDERS) {
  if (!['accuracy', 'cost'].includes(preference)) throw new Error('Coding preference must be accuracy or cost.');
  const ranked = [];
  for (const provider of providers) {
    if (provider.id === 'auto') continue;
    for (const model of catalog.get(provider.id) || []) {
      if (!model || NON_CHAT.test(model)) continue;
      const quality = qualityFor(model);
      const economy = economyFor(provider, model);
      const score = preference === 'accuracy'
        ? (quality.score * 0.85) + (economy.score * 0.15)
        : (quality.score * 0.4) + (economy.score * 0.6);
      ranked.push({
        provider, model, route: routeName(provider.id, model),
        score: Math.round(score), quality: quality.score, economy: economy.score,
        reasons: [...quality.reasons, economy.reason],
      });
    }
  }
  return ranked.sort((left, right) =>
    right.score - left.score
    || right.quality - left.quality
    || right.economy - left.economy
    || left.route.localeCompare(right.route));
}

import process, { stdout } from 'node:process';
import { PROVIDERS, routeName } from './catalog.mjs';
import { availableModels, isConfigured } from './client.mjs';
import { BROWSE_MODELS, c, choose, chooseRankedModel, paint } from './ui.mjs';

export async function readyCatalog(config, refresh = false) {
  const ready = PROVIDERS.filter(provider => {
    if (process.env.ORB_DISABLE_LOCAL === '1' && provider.kind === 'local') return false;
    return isConfigured(provider, config);
  });
  return availableModels(config, { providers: ready, refresh });
}

// Lets the user browse every connected provider and pick one of its models.
// Uses the live-filtering terminal picker so the list updates as you type.
export async function chooseModel(config) {
  stdout.write(`${paint(c.dim, 'Discovering connected models…')}\r`);
  const catalog = await readyCatalog(config, true);
  if (stdout.isTTY) stdout.write('\x1b[2K\r');
  const ready = PROVIDERS.map(provider => ({ provider, models: catalog.get(provider.id) || [] }))
    .filter(entry => entry.models.length);
  if (!ready.length) throw new Error('No ready models found. Start Ollama or add a cloud key with `orb key set <provider>`.');
  const providerId = ready.length === 1 ? ready[0].provider.id : await choose('Choose a provider', ready.map(({ provider, models }) => ({
    value: provider.id,
    label: provider.name,
    hint: `${provider.badge} · ${models.length} model${models.length === 1 ? '' : 's'}`,
  })));
  const entry = ready.find(item => item.provider.id === providerId);
  const model = entry.models.length === 1 ? entry.models[0] : await choose(`${entry.provider.name} models`, entry.models.map(value => ({
    value,
    label: value,
    hint: routeName(providerId, value) === config.selected ? 'selected' : '',
  })));
  return routeName(providerId, model);
}

// Offers the ranked shortlist first (Enter = #1, a number = that rank), with a
// "browse all" escape hatch that returns the user's own provider/model choice.
export async function chooseCodingModel(entries, config) {
  const choice = await chooseRankedModel(entries, { allowBrowse: true });
  return choice === BROWSE_MODELS ? chooseModel(config) : choice.route;
}

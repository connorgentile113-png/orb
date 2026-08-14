import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const enabled = !process.env.NO_COLOR && stdout.isTTY;
const code = value => enabled ? value : '';

export const c = {
  reset: code('\x1b[0m'), dim: code('\x1b[2m'), bold: code('\x1b[1m'),
  cyan: code('\x1b[38;5;45m'), blue: code('\x1b[38;5;75m'),
  green: code('\x1b[38;5;84m'), yellow: code('\x1b[38;5;220m'),
  red: code('\x1b[38;5;203m'), slate: code('\x1b[38;5;245m'),
};

export const paint = (color, text) => `${color}${text}${c.reset}`;

export function logo(stream = stdout) {
  stream.write(`${c.cyan}${c.bold}  ◉ orb${c.reset}  ${c.dim}free-model router${c.reset}\n`);
}

export function table(rows, columns, stream = stdout) {
  const widths = columns.map((column, index) => Math.max(
    column.label.length,
    ...rows.map(row => String(row[index] ?? '').length),
  ));
  stream.write(`${columns.map((column, i) => paint(c.dim, column.label.padEnd(widths[i]))).join('  ')}\n`);
  for (const row of rows) stream.write(`${row.map((cell, i) => String(cell ?? '').padEnd(widths[i])).join('  ')}\n`);
}

export async function choose(title, items, { input = stdin, output = stdout } = {}) {
  if (!items.length) throw new Error('There is nothing to choose from.');
  const rl = createInterface({ input, output });
  try {
    output.write(`\n${paint(c.bold, title)}\n`);
    items.forEach((item, index) => output.write(`  ${paint(c.cyan, String(index + 1).padStart(2))}  ${item.label}${item.hint ? `  ${paint(c.dim, item.hint)}` : ''}\n`));
    while (true) {
      const answer = (await rl.question(`\n${paint(c.cyan, '›')} `)).trim();
      const index = Number.parseInt(answer, 10) - 1;
      if (Number.isInteger(index) && items[index]) return items[index].value;
      output.write(`${paint(c.yellow, `Choose 1–${items.length}.`)}\n`);
    }
  } finally {
    rl.close();
  }
}

export async function secretPrompt(label, { input = stdin, output = stdout } = {}) {
  if (!input.isTTY || !output.isTTY) throw new Error('Key entry needs an interactive terminal. Use the provider environment variable instead.');
  const rl = createInterface({ input, output, terminal: true });
  const write = output.write.bind(output);
  let masking = false;
  output.write = (chunk, ...args) => write(masking && typeof chunk === 'string' ? chunk.replace(/[^\r\n]/g, '•') : chunk, ...args);
  try {
    write(`${label}: `);
    masking = true;
    const value = await rl.question('');
    masking = false;
    write('\n');
    return value.trim();
  } finally {
    masking = false;
    output.write = write;
    rl.close();
  }
}

export function usage() {
  return `
${paint(c.bold, 'Usage')}  orb <command> [options]

  ${paint(c.cyan, 'orb')}                         choose a model and chat
  ${paint(c.cyan, 'orb chat')} [message]          chat with the selected model
  ${paint(c.cyan, 'orb use')} [provider/model]    choose the default model
  ${paint(c.cyan, 'orb use auto/free')}           enable automatic free fallback
  ${paint(c.cyan, 'orb models')} [--refresh]      list available models
  ${paint(c.cyan, 'orb providers')}               list direct API providers
  ${paint(c.cyan, 'orb signup')} <provider>       show where to get a free API key
  ${paint(c.cyan, 'orb routes')}                  show auto/free fallback order
  ${paint(c.cyan, 'orb key set')} <provider>      save a provider API key
  ${paint(c.cyan, 'orb key remove')} <provider>   remove a saved API key
  ${paint(c.cyan, 'orb endpoint set')} <id> <url> configure an account endpoint
  ${paint(c.cyan, 'orb serve')} [--port 11435]    start a local OpenAI API
  ${paint(c.cyan, 'orb doctor')}                  check provider readiness

No OmniRoute login, OAuth callback, or local bearer token is required.
`;
}

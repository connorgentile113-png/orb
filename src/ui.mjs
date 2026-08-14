import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const enabled = !process.env.NO_COLOR && stdout.isTTY;
const code = value => enabled ? value : '';
const ANSI = /\x1b\[[0-?]*[ -/]*[@-~]/g;

export const c = {
  reset: code('\x1b[0m'), dim: code('\x1b[2m'), bold: code('\x1b[1m'),
  cyan: code('\x1b[38;5;45m'), blue: code('\x1b[38;5;75m'),
  green: code('\x1b[38;5;84m'), yellow: code('\x1b[38;5;220m'),
  red: code('\x1b[38;5;203m'), slate: code('\x1b[38;5;245m'), white: code('\x1b[38;5;255m'),
  selected: code('\x1b[48;5;24m\x1b[38;5;255m'),
};

const inlineMarkdown = value => {
  let text = String(value ?? '');
  const codeSpans = [];
  text = text.replace(/`([^`\n]+)`/g, (_, contents) => {
    codeSpans.push(paint(c.yellow, contents));
    return `\u0000${codeSpans.length - 1}\u0000`;
  });
  text = text
    .replace(/\*\*([^*\n]+)\*\*/g, (_, contents) => paint(c.bold, contents))
    .replace(/__([^_\n]+)__/g, (_, contents) => paint(c.bold, contents))
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (_, contents) => `\x1b[3m${contents}${c.reset}`)
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, (_, contents) => `\x1b[3m${contents}${c.reset}`);
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => codeSpans[Number(index)]);
};

export function parseRichText(value) {
  const source = String(value ?? '').replace(/\r\n/g, '\n');
  const blocks = [];
  const pattern = /<think(?:ing)?(?:\s[^>]*)?>([\s\S]*?)(?:<\/think(?:ing)?>|$)|```([^\n`]*)\n?([\s\S]*?)(?:```|$)/gi;
  let start = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > start) blocks.push({ type: 'text', content: source.slice(start, match.index) });
    if (match[1] !== undefined) blocks.push({ type: 'thinking', content: match[1].trim() });
    else blocks.push({ type: 'code', language: match[2].trim(), content: match[3].replace(/\n$/, '') });
    start = match.index + match[0].length;
  }
  if (start < source.length) blocks.push({ type: 'text', content: source.slice(start) });
  return blocks;
}

function renderTextBlock(value) {
  return String(value).split('\n').map(line => {
    if (/^#{1,6}\s+/.test(line)) return paint(c.bold, line.replace(/^#{1,6}\s+/, ''));
    if (/^>\s?/.test(line)) return `${paint(c.slate, '│')} ${paint(c.dim, inlineMarkdown(line.replace(/^>\s?/, '')))}`;
    if (/^\s*[-*+]\s+/.test(line)) return line.replace(/^(\s*)[-*+]\s+/, (_, space) => `${space}${paint(c.cyan, '•')} `).replace(/^(.*)$/s, inlineMarkdown);
    return inlineMarkdown(line);
  }).join('\n');
}

export function renderRichText(value, { thinking = false } = {}) {
  return parseRichText(value).map(block => {
    if (block.type === 'thinking') {
      if (!thinking) return `${paint(c.slate, '▸')} ${paint(c.dim, 'Thinking hidden · /thinking to expand')}`;
      const body = block.content.split('\n').map(line => `${paint(c.slate, '│')} ${paint(c.dim, line)}`).join('\n');
      return `${paint(c.cyan, '▾')} ${paint(c.bold, 'Thinking')}\n${body}`;
    }
    if (block.type === 'code') {
      const label = block.language || 'text';
      const body = block.content.split('\n').map(line => `${paint(c.slate, '│')} ${line}`).join('\n');
      return `${paint(c.cyan, `┌─ ${label}`)}\n${body}\n${paint(c.cyan, '└─')}`;
    }
    return renderTextBlock(block.content);
  }).join('');
}

export const paint = (color, text) => `${color}${text}${c.reset}`;
export const plain = value => String(value ?? '').replace(ANSI, '');
export const visibleWidth = value => [...plain(value)].length;
export const hyperlink = (label, url) => enabled ? `\x1b]8;;${url}\x07${label}\x1b]8;;\x07` : `${label} (${url})`;

export function truncate(value, width) {
  const text = plain(value);
  if (width < 1) return '';
  if ([...text].length <= width) return text;
  return width === 1 ? '…' : `${[...text].slice(0, width - 1).join('')}…`;
}

export function logo(stream = stdout) {
  stream.write(`${c.cyan}${c.bold}◆ ORB${c.reset}  ${c.dim}direct model workspace${c.reset}\n`);
}

export function divider(stream = stdout, width = Math.min(stream.columns || 80, 96)) {
  stream.write(`${paint(c.slate, '─'.repeat(Math.max(12, width)))}\n`);
}

export function sessionHeader(model, stream = stdout) {
  logo(stream);
  stream.write(`${paint(c.green, '●')} ${paint(c.bold, model)}\n`);
  stream.write(`${paint(c.dim, '  /model switch  /thinking expand  /clear reset  /help commands  /exit leave')}\n`);
  divider(stream);
}

export function chatHelp(stream = stdout) {
  stream.write(`\n${paint(c.bold, 'Commands')}\n`);
  table([
    ['/model', 'switch provider or model'],
    ['/clear', 'start a fresh conversation'],
    ['/thinking', 'expand or collapse the latest reasoning'],
    ['/help', 'show this command list'],
    ['/exit', 'leave orb'],
  ], [{ label: '' }, { label: '' }], stream);
  stream.write('\n');
}

export function table(rows, columns, stream = stdout) {
  const widths = columns.map((column, index) => Math.max(
    column.label.length,
    ...rows.map(row => visibleWidth(row[index])),
  ));
  const available = Math.max(40, stream.columns || 120);
  const separators = Math.max(0, columns.length - 1) * 2;
  const minimums = columns.map(column => Math.max(3, Math.min(column.label.length, 12)));
  while (widths.reduce((sum, width) => sum + width, separators) > available) {
    let target = -1;
    for (let index = 0; index < widths.length; index += 1) {
      if (widths[index] > minimums[index] && (target < 0 || widths[index] - minimums[index] > widths[target] - minimums[target])) target = index;
    }
    if (target < 0) break;
    widths[target] -= 1;
  }
  const fit = (value, width) => {
    if (visibleWidth(value) > width) return truncate(value, width);
    return `${value}${' '.repeat(width - visibleWidth(value))}`;
  };
  if (columns.some(column => column.label)) stream.write(`${columns.map((column, i) => paint(c.dim, fit(column.label, widths[i]))).join('  ')}\n`);
  for (const row of rows) stream.write(`${row.map((cell, i) => fit(String(cell ?? ''), widths[i])).join('  ')}\n`);
}

export function filterChoices(items, query) {
  const terms = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return items.map((item, index) => ({ item, index }));
  return items.map((item, index) => ({ item, index })).filter(({ item }) => {
    const haystack = `${item.label} ${item.hint || ''}`.toLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}

async function numberedChoice(title, items, input, output) {
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

async function terminalChoice(title, items, input, output) {
  return new Promise((resolve, reject) => {
    const wasRaw = Boolean(input.isRaw);
    let query = '';
    let selected = 0;
    let visibleStart = 0;
    let visibleCount = 0;
    const itemStartRow = 7;

    const filtered = () => filterChoices(items, query);
    const render = () => {
      const choices = filtered();
      if (selected >= choices.length) selected = Math.max(0, choices.length - 1);
      const width = Math.max(48, Math.min(output.columns || 88, 110));
      const height = Math.max(14, output.rows || 24);
      visibleCount = Math.max(3, height - 10);
      visibleStart = Math.min(
        Math.max(0, selected - Math.floor(visibleCount / 2)),
        Math.max(0, choices.length - visibleCount),
      );
      const window = choices.slice(visibleStart, visibleStart + visibleCount);
      const lines = [
        `${c.cyan}${c.bold}◆ ORB${c.reset}  ${c.dim}interactive model workspace${c.reset}`,
        `${c.dim}Keyboard and mouse enabled${c.reset}`,
        '',
        `${c.bold}${title}${c.reset}  ${c.dim}${choices.length}/${items.length}${c.reset}`,
        query ? `${c.cyan}⌕${c.reset} ${query}` : `${c.dim}⌕ Type to filter…${c.reset}`,
        '',
      ];
      if (!window.length) lines.push(`${c.yellow}  No matches — press Backspace or Esc to clear${c.reset}`);
      for (let index = 0; index < window.length; index += 1) {
        const absolute = visibleStart + index;
        const { item } = window[index];
        const marker = absolute === selected ? '›' : ' ';
        const suffix = item.hint ? `  ${item.hint}` : '';
        const content = ` ${marker} ${truncate(`${item.label}${suffix}`, width - 5)}`.padEnd(width - 1);
        lines.push(absolute === selected ? `${c.selected}${c.bold}${content}${c.reset}` : content);
      }
      while (lines.length < itemStartRow - 1 + visibleCount) lines.push('');
      lines.push('', `${c.dim}↑↓ navigate  Enter select  click an item  Esc cancel${c.reset}`);
      output.write(`\x1b[2J\x1b[H${lines.join('\n')}`);
    };

    const cleanup = () => {
      input.off('data', onData);
      output.off?.('resize', render);
      output.write('\x1b[?1000l\x1b[?1006l\x1b[?25h\x1b[?1049l');
      if (typeof input.setRawMode === 'function' && !wasRaw) input.setRawMode(false);
      input.pause?.();
    };
    const finish = choice => {
      cleanup();
      output.write(`${paint(c.green, '✓')} ${title}: ${paint(c.bold, choice.label)}\n`);
      resolve(choice.value);
    };
    const cancel = () => {
      cleanup();
      reject(new Error('Selection cancelled.'));
    };
    const move = amount => {
      const count = filtered().length;
      if (!count) return;
      selected = (selected + amount + count) % count;
      render();
    };
    const onData = chunk => {
      const value = chunk.toString('utf8');
      const mouse = value.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (mouse) {
        const button = Number(mouse[1]);
        const row = Number(mouse[3]);
        if (mouse[4] === 'M' && button === 0 && row >= itemStartRow && row < itemStartRow + visibleCount) {
          const choice = filtered()[visibleStart + row - itemStartRow];
          if (choice) finish(choice.item);
        }
        return;
      }
      if (value === '\u0003') return cancel();
      if (value === '\r' || value === '\n') {
        const choice = filtered()[selected];
        if (choice) finish(choice.item);
        return;
      }
      if (value === '\x1b[A') return move(-1);
      if (value === '\x1b[B') return move(1);
      if (value === '\x1b[5~') return move(-visibleCount);
      if (value === '\x1b[6~') return move(visibleCount);
      if (value === '\x1b[H' || value === '\x1b[1~') { selected = 0; return render(); }
      if (value === '\x1b[F' || value === '\x1b[4~') { selected = Math.max(0, filtered().length - 1); return render(); }
      if (value === '\x7f' || value === '\b') { query = query.slice(0, -1); selected = 0; return render(); }
      if (value === '\u0015') { query = ''; selected = 0; return render(); }
      if (value === '\x1b') {
        if (query) { query = ''; selected = 0; return render(); }
        return cancel();
      }
      const printable = value.replace(/[^\x20-\x7E]/g, '');
      if (printable) { query += printable; selected = 0; render(); }
    };

    input.on('data', onData);
    output.on?.('resize', render);
    if (typeof input.setRawMode === 'function') input.setRawMode(true);
    input.resume?.();
    output.write('\x1b[?1049h\x1b[?25l\x1b[?1000h\x1b[?1006h');
    render();
  });
}

export async function choose(title, items, { input = stdin, output = stdout } = {}) {
  if (!items.length) throw new Error('There is nothing to choose from.');
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') return numberedChoice(title, items, input, output);
  return terminalChoice(title, items, input, output);
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
  ${paint(c.cyan, 'orb code')} [message]          rank connected coding models and chat
  ${paint(c.cyan, 'orb code --accuracy')}         prefer maximum coding quality
  ${paint(c.cyan, 'orb code --cost')}             prefer cost-efficient coding
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
Interactive menus support arrow keys, live search, Enter, and mouse clicks.
`;
}

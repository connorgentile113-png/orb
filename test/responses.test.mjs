import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chatStreamToResponses,
  chatToResponseItems,
  inputToMessages,
  responsesObject,
  toChatRequest,
  toolChoiceToChat,
  toolsToChat,
} from '../src/responses.mjs';

test('inputToMessages maps instructions, roles, and tool call history', () => {
  const messages = inputToMessages({
    instructions: 'Be a coder.',
    input: [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'list files' }] },
      { type: 'function_call', call_id: 'call_1', name: 'bash', arguments: '{"cmd":"ls"}' },
      { type: 'function_call_output', call_id: 'call_1', output: 'file.txt' },
      { type: 'message', role: 'developer', content: [{ type: 'text', text: 'hint' }] },
    ],
  });
  assert.deepEqual(messages, [
    { role: 'system', content: 'Be a coder.' },
    { role: 'user', content: 'list files' },
    {
      role: 'assistant', content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'bash', arguments: '{"cmd":"ls"}' } }],
    },
    { role: 'tool', tool_call_id: 'call_1', content: 'file.txt' },
    { role: 'system', content: 'hint' },
  ]);
});

test('inputToMessages accepts a plain string input', () => {
  assert.deepEqual(inputToMessages({ input: 'hello' }), [{ role: 'user', content: 'hello' }]);
});

test('toolsToChat and toolChoiceToChat convert Codex tool definitions', () => {
  const tools = toolsToChat([
    { type: 'function', name: 'bash', description: 'run a command', parameters: { type: 'object' } },
    { type: 'file_search' },
  ]);
  assert.deepEqual(tools, [
    { type: 'function', function: { name: 'bash', description: 'run a command', parameters: { type: 'object' } } },
  ]);
  assert.equal(toolChoiceToChat('auto'), 'auto');
  assert.deepEqual(toolChoiceToChat({ type: 'function', name: 'bash' }), { type: 'function', function: { name: 'bash' } });
  assert.equal(toolChoiceToChat(undefined), undefined);
});

test('toChatRequest maps the Responses request shape to chat arguments', () => {
  const request = toChatRequest({
    model: 'openrouter/qwen/qwen3-coder:free',
    instructions: 'code',
    input: [{ type: 'message', role: 'user', content: 'hi' }],
    tools: [{ type: 'function', name: 'bash', parameters: {} }],
    tool_choice: 'required',
    stream: true,
    max_output_tokens: 4096,
    temperature: 0.2,
  });
  assert.equal(request.route, 'openrouter/qwen/qwen3-coder:free');
  assert.equal(request.stream, true);
  assert.equal(request.maxTokens, 4096);
  assert.equal(request.temperature, 0.2);
  assert.equal(request.toolChoice, 'required');
  assert.equal(request.tools.length, 1);
  assert.equal(request.messages[0].role, 'system');
});

test('chatToResponseItems and responsesObject build a completed response', () => {
  const items = chatToResponseItems({
    content: 'done',
    tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
  });
  assert.equal(items.length, 2);
  assert.equal(items[0].type, 'message');
  assert.equal(items[1].type, 'function_call');
  assert.equal(items[1].call_id, 'call_1');
  const body = responsesObject({ id: 'resp_1', model: 'x/y', items, usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } });
  assert.equal(body.object, 'response');
  assert.equal(body.status, 'completed');
  assert.equal(body.output.length, 2);
  assert.deepEqual(body.usage, { input_tokens: 2, output_tokens: 3, total_tokens: 5 });
});

test('chatStreamToResponses emits the event sequence Codex expects', async () => {
  const upstream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const chunk = value => controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      chunk({ choices: [{ delta: { role: 'assistant', content: 'Hel' }, finish_reason: null }] });
      chunk({ choices: [{ delta: { content: 'lo' }, finish_reason: null }] });
      chunk({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'bash', arguments: '{"cmd":"ls"}' } }] }, finish_reason: 'tool_calls' }] });
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  const stream = chatStreamToResponses(upstream, { id: 'resp_1', model: 'openrouter/x' });
  const decoder = new TextDecoder();
  const events = [];
  let buffer = '';
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
  }
  buffer += decoder.decode();
  for (const block of buffer.split('\n\n')) {
    const eventLine = block.split('\n').find(line => line.startsWith('event: '));
    const dataLine = block.split('\n').find(line => line.startsWith('data: '));
    if (!eventLine || !dataLine) continue;
    events.push({ event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) });
  }
  const types = events.map(entry => entry.event);
  assert.deepEqual(types, [
    'response.created',
    'response.in_progress',
    'response.output_item.added',
    'response.content_part.added',
    'response.output_text.delta',
    'response.output_text.delta',
    'response.output_text.done',
    'response.content_part.done',
    'response.output_item.done',
    'response.output_item.added',
    'response.function_call_arguments.delta',
    'response.function_call_arguments.done',
    'response.output_item.done',
    'response.completed',
  ]);
  const completed = events.at(-1).data.response;
  assert.equal(completed.status, 'completed');
  assert.equal(completed.output.length, 2);
  assert.equal(completed.output[0].content[0].text, 'Hello');
  assert.equal(completed.output[1].type, 'function_call');
  assert.equal(completed.output[1].arguments, '{"cmd":"ls"}');
});

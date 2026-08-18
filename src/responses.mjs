import { randomUUID } from 'node:crypto';

// Translates between the OpenAI Responses API (what the Codex CLI speaks) and
// the Chat Completions API (what orb already proxies to every provider). This
// lets `orb serve` act as a drop-in model provider for Codex 0.122+, which
// removed the `wire_api = "chat"` escape hatch and only accepts Responses.

const SSE_ENCODER = new TextEncoder();

function stringifyContent(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(item => stringifyContent(item)).join('');
  if (typeof value === 'object') {
    const text = value.text ?? value.output ?? '';
    return Array.isArray(text) ? text.join('') : String(text);
  }
  return String(value);
}

function mapRole(role) {
  // Responses supports "developer"; chat-completion providers broadly accept
  // "system" instead, so collapse it for maximum compatibility.
  return role === 'developer' ? 'system' : role;
}

function messageFromItem(item) {
  const role = mapRole(item.role);
  if (!role) return null;
  return { role, content: stringifyContent(item.content) };
}

// Gemini thinking models attach an opaque `thought_signature` to each function
// call part and require it back on the next turn. The OpenAI Chat Completions
// shape orb speaks has no field for it, so it arrives in `extra_content` and is
// silently dropped when we translate to the Responses API. We stash it in a
// cache keyed by the tool-call id and re-attach it when the follow-up turn
// replays the assistant message's tool_calls.
export function thoughtSignatureOf(toolCall) {
  if (!toolCall || typeof toolCall !== 'object') return undefined;
  return toolCall.extra_content?.google?.thought_signature
    ?? toolCall.function?.thought_signature
    ?? toolCall.thought_signature;
}

export function createSignatureCache(limit = 10_000) {
  const store = new Map();
  return {
    set(key, signature) {
      if (!key || !signature) return;
      if (store.size >= limit) {
        const oldest = store.keys().next().value;
        if (oldest) store.delete(oldest);
      }
      store.set(key, signature);
    },
    get(key) {
      return store.get(key);
    },
  };
}

export function inputToMessages(body, signatures) {
  const messages = [];
  const instructions = stringifyContent(body.instructions);
  if (instructions) messages.push({ role: 'system', content: instructions });
  const input = body.input;
  if (input == null) return messages;
  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
    return messages;
  }
  if (!Array.isArray(input)) return messages;
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    if (item.type === 'function_call') {
      const previous = messages[messages.length - 1];
      const id = item.call_id || `call_${randomUUID()}`;
      const signature = signatures?.get(item.call_id || id);
      const call = {
        id,
        type: 'function',
        function: { name: item.name || '', arguments: stringifyContent(item.arguments) },
      };
      if (signature) call.extra_content = { google: { thought_signature: signature } };
      if (previous?.role === 'assistant' && Array.isArray(previous.tool_calls)) {
        previous.tool_calls.push(call);
      } else {
        messages.push({ role: 'assistant', content: null, tool_calls: [call] });
      }
      continue;
    }
    if (item.type === 'function_call_output') {
      messages.push({
        role: 'tool',
        tool_call_id: item.call_id || '',
        content: stringifyContent(item.output),
      });
      continue;
    }
    const message = messageFromItem(item);
    if (message) messages.push(message);
  }
  return messages;
}

export function toolsToChat(tools) {
  if (!Array.isArray(tools)) return [];
  return tools
    .filter(tool => tool && tool.type === 'function' && tool.name)
    .map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: stringifyContent(tool.description),
        parameters: tool.parameters || { type: 'object', properties: {} },
      },
    }));
}

export function toolChoiceToChat(choice) {
  if (!choice) return undefined;
  if (typeof choice === 'string') return choice;
  if (choice.type === 'function' && choice.name) {
    return { type: 'function', function: { name: choice.name } };
  }
  return undefined;
}

export function toChatRequest(body, signatures) {
  return {
    route: typeof body.model === 'string' ? body.model : '',
    messages: inputToMessages(body, signatures),
    tools: toolsToChat(body.tools),
    toolChoice: toolChoiceToChat(body.tool_choice),
    stream: Boolean(body.stream),
    maxTokens: Number.isFinite(body.max_output_tokens) ? body.max_output_tokens : undefined,
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
  };
}

function usageFrom(usage) {
  return {
    input_tokens: usage?.prompt_tokens ?? 0,
    output_tokens: usage?.completion_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
  };
}

export function chatToResponseItems(message, signatures) {
  const items = [];
  const content = stringifyContent(message?.content);
  const toolCalls = message?.tool_calls || [];
  if (content) {
    items.push({
      id: `msg_${randomUUID()}`,
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: content, annotations: [] }],
    });
  }
  for (const call of toolCalls) {
    const signature = thoughtSignatureOf(call);
    if (signature) signatures?.set(call.id, signature);
    items.push({
      id: `fc_${randomUUID()}`,
      type: 'function_call',
      status: 'completed',
      call_id: call.id || `call_${randomUUID()}`,
      name: call.function?.name || '',
      arguments: stringifyContent(call.function?.arguments),
    });
  }
  return items;
}

export function responsesObject({ id, model, items, usage }) {
  return {
    id,
    object: 'response',
    created_at: Math.floor(Date.now() / 1000),
    status: 'completed',
    model,
    output: items,
    usage: usageFrom(usage),
  };
}

function sse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Converts an upstream Chat Completions SSE body into a Responses API SSE
// stream. Codex is strict about the event sequence, so this mirrors the
// canonical ordering: created -> in_progress -> message item -> text deltas ->
// function-call items -> completed.
export function chatStreamToResponses(upstreamBody, { id, model, signatures }) {
  const responseId = id;
  const createdAt = Math.floor(Date.now() / 1000);
  return new ReadableStream({
    async start(controller) {
      const enqueue = (event, data) => controller.enqueue(SSE_ENCODER.encode(sse(event, data)));
      const finalOutput = [];
      const calls = new Map();
      let usage = null;
      let nextOutputIndex = 0;
      let messageItemId = null;
      let messageOutputIndex = -1;
      let messageStarted = false;
      let messageFinished = false;
      let messageText = '';

      const baseResponse = status => ({
        id: responseId,
        object: 'response',
        created_at: createdAt,
        status,
        model,
        output: status === 'completed' ? finalOutput : [],
        ...(status === 'completed' ? { usage: usageFrom(usage) } : {}),
      });

      const startMessage = () => {
        if (messageStarted) return;
        messageStarted = true;
        messageItemId = `msg_${randomUUID()}`;
        messageOutputIndex = nextOutputIndex++;
        enqueue('response.output_item.added', {
          type: 'response.output_item.added',
          output_index: messageOutputIndex,
          item: { id: messageItemId, type: 'message', role: 'assistant', status: 'in_progress', content: [] },
        });
        enqueue('response.content_part.added', {
          type: 'response.content_part.added',
          item_id: messageItemId,
          output_index: messageOutputIndex,
          content_index: 0,
          part: { type: 'output_text', text: '', annotations: [] },
        });
      };

      const finishMessage = () => {
        if (messageFinished) return;
        startMessage();
        const item = {
          id: messageItemId,
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text: messageText, annotations: [] }],
        };
        enqueue('response.output_text.done', {
          type: 'response.output_text.done',
          item_id: messageItemId,
          output_index: messageOutputIndex,
          content_index: 0,
          text: messageText,
        });
        enqueue('response.content_part.done', {
          type: 'response.content_part.done',
          item_id: messageItemId,
          output_index: messageOutputIndex,
          content_index: 0,
          part: { type: 'output_text', text: messageText, annotations: [] },
        });
        finalOutput.push(item);
        enqueue('response.output_item.done', {
          type: 'response.output_item.done',
          output_index: messageOutputIndex,
          item,
        });
        messageFinished = true;
      };

      const startCall = index => {
        if (calls.has(index)) return;
        const call = {
          id: `fc_${randomUUID()}`,
          callId: '',
          name: '',
          arguments: '',
          signature: undefined,
          outputIndex: nextOutputIndex++,
          finished: false,
        };
        calls.set(index, call);
        enqueue('response.output_item.added', {
          type: 'response.output_item.added',
          output_index: call.outputIndex,
          item: { id: call.id, type: 'function_call', status: 'in_progress', call_id: call.callId, name: '', arguments: '' },
        });
      };

      const finishCall = call => {
        if (call.finished) return;
        call.finished = true;
        if (call.signature && call.callId) signatures?.set(call.callId, call.signature);
        const item = {
          id: call.id,
          type: 'function_call',
          status: 'completed',
          call_id: call.callId,
          name: call.name,
          arguments: call.arguments,
        };
        enqueue('response.function_call_arguments.done', {
          type: 'response.function_call_arguments.done',
          item_id: call.id,
          output_index: call.outputIndex,
          arguments: call.arguments,
        });
        finalOutput.push(item);
        enqueue('response.output_item.done', {
          type: 'response.output_item.done',
          output_index: call.outputIndex,
          item,
        });
      };

      const finishCalls = () => {
        for (const call of calls.values()) finishCall(call);
      };

      enqueue('response.created', { type: 'response.created', response: baseResponse('in_progress') });
      enqueue('response.in_progress', { type: 'response.in_progress', response: baseResponse('in_progress') });

      const decoder = new TextDecoder();
      let buffer = '';
      try {
        for await (const chunk of upstreamBody) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === '[DONE]') continue;
            let value;
            try { value = JSON.parse(raw); } catch { continue; }
            if (value.usage) usage = value.usage;
            const choice = value.choices?.[0];
            if (!choice) continue;
            const delta = choice.delta || {};
            const content = delta.content;
            const toolCalls = Array.isArray(delta.tool_calls) ? delta.tool_calls : null;
            if (!messageStarted && (content !== undefined || toolCalls)) startMessage();
            if (content) {
              messageText += content;
              enqueue('response.output_text.delta', {
                type: 'response.output_text.delta',
                item_id: messageItemId,
                output_index: messageOutputIndex,
                content_index: 0,
                delta: content,
              });
            }
            if (toolCalls) {
              finishMessage();
              for (const entry of toolCalls) {
                const index = Number.isInteger(entry.index) ? entry.index : 0;
                startCall(index);
                const call = calls.get(index);
                if (entry.id) call.callId = entry.id;
                const signature = thoughtSignatureOf(entry);
                if (signature) {
                  call.signature = signature;
                  if (call.callId) signatures?.set(call.callId, signature);
                }
                if (entry.function?.name) call.name = entry.function.name;
                const args = entry.function?.arguments || '';
                if (args) {
                  call.arguments += args;
                  enqueue('response.function_call_arguments.delta', {
                    type: 'response.function_call_arguments.delta',
                    item_id: call.id,
                    output_index: call.outputIndex,
                    delta: args,
                  });
                }
              }
            }
            if (choice.finish_reason) {
              finishMessage();
              finishCalls();
            }
          }
        }
        finishMessage();
        finishCalls();
        enqueue('response.completed', { type: 'response.completed', response: baseResponse('completed') });
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

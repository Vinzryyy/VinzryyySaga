import { describe, expect, it } from 'vitest';
import { drainSSE } from '../../../api/arme-chat.js';

describe('drainSSE', () => {
  it('parses LF-separated events', () => {
    const { events, rest } = drainSSE('data: {"a":1}\n\ndata: {"b":2}\n\npartial');
    expect(events).toEqual(['{"a":1}', '{"b":2}']);
    expect(rest).toBe('partial');
  });
  it('parses CRLF-separated events (Gemini alt=sse)', () => {
    const { events } = drainSSE('data: {"candidates":[]}\r\n\r\ndata: {"x":1}\r\n\r\n');
    expect(events).toEqual(['{"candidates":[]}', '{"x":1}']);
  });
});

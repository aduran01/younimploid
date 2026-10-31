import { describe, expect, it } from 'vitest';
import { handleMessage } from '../../src/background/router';

describe('handleMessage', () => {
  it('answers PING with PONG', () => {
    expect(handleMessage({ type: 'PING' })).toEqual({ type: 'PONG' });
  });
});

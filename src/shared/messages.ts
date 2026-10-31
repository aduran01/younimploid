// Every message between extension contexts is declared here.

export type Message = { type: 'PING' };

export type ResponseFor<M extends Message> = M extends { type: 'PING' } ? { type: 'PONG' } : never;

export function sendMessage<M extends Message>(message: M): Promise<ResponseFor<M>> {
  return chrome.runtime.sendMessage(message);
}

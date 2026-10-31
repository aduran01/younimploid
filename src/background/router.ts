import type { Message, ResponseFor } from '../shared/messages';

export function handleMessage<M extends Message>(message: M): ResponseFor<M>;
export function handleMessage(message: Message): ResponseFor<Message> {
  switch (message.type) {
    case 'PING':
      return { type: 'PONG' };
  }
}

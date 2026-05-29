import { EventEmitter } from 'events';

export interface SupportEvent {
  type: 'ticket_created' | 'ticket_updated' | 'ticket_message' | 'ticket_status' | 'ticket_assigned';
  ticketId: string;
  payload?: any;
}

export const supportEvents = new EventEmitter();

supportEvents.setMaxListeners(0);

export const emitSupportEvent = (event: SupportEvent) => {
  supportEvents.emit('event', event);
};


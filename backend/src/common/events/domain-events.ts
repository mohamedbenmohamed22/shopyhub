/**
 * Central catalog of domain events emitted across the backend.
 *
 * Services emit these via EventEmitter2; listeners in src/listeners react to
 * them (notifications, audit log, denormalized counters). This decouples the
 * write path (e.g. "create order") from side effects (e.g. "send SMS"), so the
 * HTTP request returns fast and new reactions can be added without touching the
 * service.
 */
export const DomainEvent = {
  OrderCreated: 'order.created',
  OrderStatusChanged: 'order.status_changed',
  SubscriberSubscribed: 'subscriber.subscribed',
  SubscriberUnsubscribed: 'subscriber.unsubscribed',
  VoteCast: 'vote.cast',
  ProductCreated: 'product.created',
  WeeklyWinnerSet: 'weekly.winner_set',
} as const;

export type DomainEventName = (typeof DomainEvent)[keyof typeof DomainEvent];

// ---- Event payloads -------------------------------------------------------

export interface OrderCreatedEvent {
  orderId: string;
  orderNumber: string;
  fullName: string;
  phone: string;
  governorate: string;
  total: number;
  items: { productName: string; quantity: number }[];
}

export interface OrderStatusChangedEvent {
  orderId: string;
  orderNumber: string;
  phone: string;
  from: string;
  to: string;
}

export interface SubscriberSubscribedEvent {
  subscriberId: string;
  email: string;
  resubscribed: boolean;
}

export interface SubscriberUnsubscribedEvent {
  subscriberId: string;
  email: string;
}

export interface VoteCastEvent {
  productId: string;
  editionId: string;
  votesCount: number;
}

export interface ProductCreatedEvent {
  productId: string;
  name: string;
  slug: string;
}

export interface WeeklyWinnerSetEvent {
  editionId: string;
  weekNumber: number;
  year: number;
  winnerProductId: string;
}

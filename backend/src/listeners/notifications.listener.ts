import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DomainEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  SubscriberSubscribedEvent,
} from '../common/events/domain-events';

/**
 * Reacts to domain events with outbound notifications.
 *
 * Today these are logged stubs. To make them real, drop an SMS/email client in
 * here (Twilio / a Tunisian SMS gateway / SES) — no other module changes,
 * because the write path only emits events and never calls this directly.
 *
 * `async` handlers run outside the HTTP request, so a slow/failed notification
 * never blocks or fails the customer's order.
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger('Notifications');

  @OnEvent(DomainEvent.OrderCreated, { async: true })
  async onOrderCreated(e: OrderCreatedEvent) {
    // TODO: send SMS "We received your order POW-… and will call to confirm".
    this.logger.log(
      `📦 Order ${e.orderNumber} from ${e.fullName} (${e.phone}, ${e.governorate}) — ${e.total} TND. SMS confirmation queued.`,
    );
  }

  @OnEvent(DomainEvent.OrderStatusChanged, { async: true })
  async onOrderStatusChanged(e: OrderStatusChangedEvent) {
    // TODO: notify the customer their order is now confirmed/shipped/etc.
    this.logger.log(`🔄 Order ${e.orderNumber}: ${e.from} → ${e.to}. Customer ${e.phone} notified.`);
  }

  @OnEvent(DomainEvent.SubscriberSubscribed, { async: true })
  async onSubscribed(e: SubscriberSubscribedEvent) {
    // TODO: send the newsletter welcome/confirmation email.
    this.logger.log(`✉️  ${e.resubscribed ? 'Re-subscribed' : 'Subscribed'}: ${e.email}. Welcome email queued.`);
  }
}

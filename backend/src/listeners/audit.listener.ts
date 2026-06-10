import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../common/events/domain-events';

/**
 * Cross-cutting audit log. Listens to every domain event with a wildcard and
 * records it. Swap the logger for an inserts into an `audit_log` table or a
 * shipper to your observability stack when you need a durable trail.
 */
@Injectable()
export class AuditListener {
  private readonly logger = new Logger('Audit');

  @OnEvent('order.*')
  @OnEvent('subscriber.*')
  @OnEvent('vote.*')
  @OnEvent('product.*')
  @OnEvent('weekly.*')
  handleAny(payload: unknown) {
    // Wildcard listeners require `wildcard: true` on EventEmitterModule.forRoot.
    this.logger.debug(`[event] ${JSON.stringify(payload)}`);
  }

  // Explicit, named hooks are easy to extend with real logic later.
  @OnEvent(DomainEvent.VoteCast)
  onVote(payload: { productId: string; votesCount: number }) {
    this.logger.debug(`vote → product ${payload.productId} now at ${payload.votesCount} votes`);
  }
}

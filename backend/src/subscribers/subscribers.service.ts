import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';
import {
  DomainEvent,
  SubscriberSubscribedEvent,
  SubscriberUnsubscribedEvent,
} from '../common/events/domain-events';

@Injectable()
export class SubscribersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Public: subscribe. Idempotent — re-subscribing a removed email reactivates it. */
  async subscribe(email: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.subscriber.findUnique({ where: { email: normalized } });

    const subscriber = await this.prisma.subscriber.upsert({
      where: { email: normalized },
      update: { status: SubStatus.subscribed, unsubscribedAt: null },
      create: { email: normalized, unsubscribeToken: randomUUID() },
    });

    const resubscribed = !!existing && existing.status === SubStatus.unsubscribed;
    if (!existing || resubscribed) {
      this.events.emit(DomainEvent.SubscriberSubscribed, {
        subscriberId: subscriber.id,
        email: subscriber.email,
        resubscribed,
      } satisfies SubscriberSubscribedEvent);
    }

    return { email: subscriber.email, status: subscriber.status };
  }

  /** Public: unsubscribe via the token emailed to the subscriber. */
  async unsubscribe(token: string) {
    const subscriber = await this.prisma.subscriber.findUnique({ where: { unsubscribeToken: token } });
    if (!subscriber) throw new NotFoundException('Invalid unsubscribe link');

    if (subscriber.status === SubStatus.subscribed) {
      await this.prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: SubStatus.unsubscribed, unsubscribedAt: new Date() },
      });
      this.events.emit(DomainEvent.SubscriberUnsubscribed, {
        subscriberId: subscriber.id,
        email: subscriber.email,
      } satisfies SubscriberUnsubscribedEvent);
    }
    return { email: subscriber.email, status: SubStatus.unsubscribed };
  }

  /** Admin: list subscribers. */
  async findAll(query: PaginationDto, status?: SubStatus) {
    const where = status ? { status } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.subscriber.count({ where }),
    ]);
    return paginated(data, total, query.page, query.limit);
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvent, VoteCastEvent } from '../common/events/domain-events';

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Public: cast one vote for a product within the currently open edition. */
  async vote(productId: string, fingerprint: string, ip?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const now = new Date();
    const edition = await this.prisma.weeklyEdition.findFirst({
      where: {
        votingOpensAt: { lte: now },
        OR: [{ votingClosesAt: null }, { votingClosesAt: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!edition) throw new UnprocessableEntityException('Voting is currently closed');

    try {
      const votesCount = await this.prisma.$transaction(async (tx) => {
        await tx.vote.create({
          data: { productId, editionId: edition.id, voterFingerprint: fingerprint, ipAddress: ip },
        });
        const updated = await tx.product.update({
          where: { id: productId },
          data: { votesCount: { increment: 1 } },
          select: { votesCount: true },
        });
        return updated.votesCount;
      });

      this.events.emit(DomainEvent.VoteCast, {
        productId,
        editionId: edition.id,
        votesCount,
      } satisfies VoteCastEvent);

      return { productId, votesCount };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('You have already voted in this edition');
      }
      throw e;
    }
  }
}

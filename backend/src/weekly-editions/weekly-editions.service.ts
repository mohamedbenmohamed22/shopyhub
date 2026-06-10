import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvent, WeeklyWinnerSetEvent } from '../common/events/domain-events';
import { CreateEditionDto } from './dto/create-edition.dto';

@Injectable()
export class WeeklyEditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Public: the edition currently open for voting (or the most recent one). */
  async current() {
    const now = new Date();
    const open = await this.prisma.weeklyEdition.findFirst({
      where: {
        votingOpensAt: { lte: now },
        OR: [{ votingClosesAt: null }, { votingClosesAt: { gte: now } }],
      },
      include: { winner: true },
      orderBy: { createdAt: 'desc' },
    });
    const edition =
      open ??
      (await this.prisma.weeklyEdition.findFirst({
        include: { winner: true },
        orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      }));
    if (!edition) throw new NotFoundException('No weekly edition exists yet');

    const tally = await this.prisma.vote.groupBy({
      by: ['productId'],
      where: { editionId: edition.id },
      _count: { _all: true },
    });

    return {
      ...edition,
      tallies: tally.map((t) => ({ productId: t.productId, votes: t._count._all })),
    };
  }

  async findAll() {
    return this.prisma.weeklyEdition.findMany({
      include: { winner: true },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    });
  }

  /** Admin: open a new edition. */
  async create(dto: CreateEditionDto) {
    return this.prisma.weeklyEdition.create({
      data: {
        weekNumber: dto.weekNumber,
        year: dto.year,
        votingOpensAt: dto.votingOpensAt ? new Date(dto.votingOpensAt) : null,
        votingClosesAt: dto.votingClosesAt ? new Date(dto.votingClosesAt) : null,
        winnerProductId: dto.winnerProductId,
      },
    });
  }

  /** Admin: declare the winner and sync the product's is_current_winner flag. */
  async setWinner(editionId: string, winnerProductId: string) {
    const edition = await this.prisma.weeklyEdition.findUnique({ where: { id: editionId } });
    if (!edition) throw new NotFoundException('Edition not found');
    const product = await this.prisma.product.findUnique({ where: { id: winnerProductId } });
    if (!product) throw new NotFoundException('Winner product not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { isCurrentWinner: true, NOT: { id: winnerProductId } },
        data: { isCurrentWinner: false },
      });
      await tx.product.update({
        where: { id: winnerProductId },
        data: { isCurrentWinner: true, weekNumber: edition.weekNumber, year: edition.year },
      });
      return tx.weeklyEdition.update({
        where: { id: editionId },
        data: { winnerProductId, votingClosesAt: edition.votingClosesAt ?? new Date() },
        include: { winner: true },
      });
    });

    this.events.emit(DomainEvent.WeeklyWinnerSet, {
      editionId: updated.id,
      weekNumber: updated.weekNumber,
      year: updated.year,
      winnerProductId,
    } satisfies WeeklyWinnerSetEvent);

    return updated;
  }
}

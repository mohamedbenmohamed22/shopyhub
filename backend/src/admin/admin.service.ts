import { Injectable } from '@nestjs/common';
import { OrderStatus, ProductStatus, SubStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginated } from '../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Single payload powering the admin dashboard. */
  async overview() {
    const [
      productCount,
      publishedProducts,
      orderTotals,
      ordersByStatus,
      subscriberCount,
      activeSubscribers,
      voteCount,
      recentOrders,
    ] = await this.prisma.$transaction([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: ProductStatus.published } }),
      this.prisma.order.aggregate({ _count: { _all: true }, _sum: { total: true } }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.subscriber.count(),
      this.prisma.subscriber.count({ where: { status: SubStatus.subscribed } }),
      this.prisma.vote.count(),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { items: true, governorate: true },
      }),
    ]);

    const ordersStatusMap = Object.fromEntries(
      Object.values(OrderStatus).map((s) => [s, 0]),
    ) as Record<OrderStatus, number>;
    for (const row of ordersByStatus) {
      ordersStatusMap[row.status] = (row._count as { _all: number })._all;
    }

    // Revenue counts orders that weren't cancelled.
    const cancelledTotal = await this.prisma.order.aggregate({
      where: { status: OrderStatus.cancelled },
      _sum: { total: true },
    });
    const grossRevenue = Number(orderTotals._sum.total ?? 0);
    const cancelledRevenue = Number(cancelledTotal._sum.total ?? 0);

    return {
      products: { total: productCount, published: publishedProducts },
      orders: {
        total: orderTotals._count._all,
        byStatus: ordersStatusMap,
        grossRevenueTnd: grossRevenue,
        netRevenueTnd: grossRevenue - cancelledRevenue,
      },
      subscribers: { total: subscriberCount, active: activeSubscribers },
      votes: { total: voteCount },
      recentOrders,
    };
  }

  /** Admin: every vote with product + edition context. */
  async votes(query: PaginationDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vote.findMany({
        include: { product: { select: { id: true, name: true } }, edition: true },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.vote.count(),
    ]);
    return paginated(data, total, query.page, query.limit);
  }
}

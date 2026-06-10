import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginated } from '../common/dto/pagination.dto';
import {
  DomainEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '../common/events/domain-events';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

// Legal status transitions for the COD workflow.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: [OrderStatus.confirmed, OrderStatus.cancelled],
  confirmed: [OrderStatus.shipped, OrderStatus.cancelled],
  shipped: [OrderStatus.delivered, OrderStatus.cancelled],
  delivered: [],
  cancelled: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Public: place a cash-on-delivery order. Pricing is computed server-side. */
  async create(dto: CreateOrderDto) {
    // Normalize cart items vs. the legacy single-product shape, and merge dupes.
    const requested = dto.items?.length
      ? dto.items
      : dto.productId
        ? [{ productId: dto.productId, quantity: dto.quantity ?? 1 }]
        : [];
    if (requested.length === 0) {
      throw new BadRequestException('An order must contain at least one item');
    }
    const lines = new Map<string, number>();
    for (const item of requested) {
      lines.set(item.productId, (lines.get(item.productId) ?? 0) + item.quantity);
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...lines.keys()] } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const [productId, quantity] of lines) {
      const product = byId.get(productId);
      if (!product || product.status !== ProductStatus.published) {
        throw new UnprocessableEntityException('A product in your cart is not available for ordering');
      }
      if (product.stock < quantity) {
        throw new UnprocessableEntityException(
          `Not enough stock for "${product.name}" (${product.stock} left)`,
        );
      }
    }

    const governorate = await this.prisma.governorate.findUnique({
      where: { id: dto.customer.governorateId },
    });
    if (!governorate || !governorate.active) {
      throw new UnprocessableEntityException('Selected governorate is not available');
    }

    const itemData = [...lines].map(([productId, quantity]) => {
      const product = byId.get(productId)!;
      const unitPrice = new Prisma.Decimal(product.price ?? 0);
      return {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        lineTotal: unitPrice.mul(quantity),
      };
    });
    const subtotal = itemData.reduce((sum, i) => sum.add(i.lineTotal), new Prisma.Decimal(0));
    const deliveryFee = governorate.deliveryFee;
    const total = subtotal.add(deliveryFee);

    const order = await this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const seq = (await tx.order.count({ where: { orderNumber: { startsWith: `POW-${year}-` } } })) + 1;
      const orderNumber = `POW-${year}-${String(seq).padStart(6, '0')}`;

      // Decrement stock atomically, guarding against concurrent oversell.
      for (const [productId, quantity] of lines) {
        const updated = await tx.product.updateMany({
          where: { id: productId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (updated.count === 0) {
          throw new UnprocessableEntityException('A product in your cart just went out of stock');
        }
      }

      return tx.order.create({
        data: {
          orderNumber,
          fullName: dto.customer.fullName,
          phone: dto.customer.phone.replace(/\s/g, ''),
          governorateId: governorate.id,
          address: dto.customer.address,
          subtotal,
          deliveryFee,
          total,
          notes: dto.notes,
          items: { create: itemData },
        },
        include: { items: true, governorate: true },
      });
    });

    this.events.emit(DomainEvent.OrderCreated, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      fullName: order.fullName,
      phone: order.phone,
      governorate: governorate.name,
      total: Number(order.total),
      items: order.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
    } satisfies OrderCreatedEvent);

    return order;
  }

  /** Admin: paginated list with filters. */
  async findAll(query: QueryOrdersDto) {
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.phone) where.phone = { contains: query.phone.replace(/\s/g, '') };
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true, governorate: true },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginated(data, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, governorate: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Admin: move an order along its lifecycle. */
  async updateStatus(id: string, to: OrderStatus) {
    const order = await this.findOne(id);
    if (order.status === to) return order;

    if (!TRANSITIONS[order.status].includes(to)) {
      throw new BadRequestException(
        `Cannot move order from '${order.status}' to '${to}'`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: to },
      include: { items: true, governorate: true },
    });

    this.events.emit(DomainEvent.OrderStatusChanged, {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      phone: updated.phone,
      from: order.status,
      to,
    } satisfies OrderStatusChangedEvent);

    return updated;
  }
}

import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { paginated } from '../common/dto/pagination.dto';
import { slugify } from '../common/slug.util';
import { DomainEvent, ProductCreatedEvent } from '../common/events/domain-events';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductSort, QueryProductsDto, TagMatchMode } from './dto/query-products.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export interface UploadedImage {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly storage: StorageService,
  ) {}

  /** Public + admin list. Public callers only ever see published products. */
  async findAll(query: QueryProductsDto, includeAllStatuses = false) {
    const where: Prisma.ProductWhereInput = {};
    if (!includeAllStatuses) {
      where.status = ProductStatus.published;
    } else if (query.status) {
      where.status = query.status;
    }
    if (query.category) where.category = { slug: query.category };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.tags?.length) {
      if (query.tagMode === TagMatchMode.All) {
        // Product must carry EVERY requested tag slug.
        where.AND = query.tags.map((slug) => ({ tags: { some: { slug } } }));
      } else {
        // Match products carrying ANY of the requested tag slugs.
        where.tags = { some: { slug: { in: query.tags } } };
      }
    }
    if (query.minPrice != null || query.maxPrice != null) {
      where.price = {};
      if (query.minPrice != null) where.price.gte = query.minPrice;
      if (query.maxPrice != null) where.price.lte = query.maxPrice;
    }
    if (query.inStock) where.stock = { gt: 0 };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { tagline: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.year) where.year = query.year;
    if (query.week) where.weekNumber = query.week;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: true, tags: true },
        orderBy: this.orderBy(query.sort),
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginated(data, total, query.page, query.limit);
  }

  /** Translate the requested sort into a Prisma orderBy clause. */
  private orderBy(sort?: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case ProductSort.PriceAsc:
        return [{ price: 'asc' }, { createdAt: 'desc' }];
      case ProductSort.PriceDesc:
        return [{ price: 'desc' }, { createdAt: 'desc' }];
      case ProductSort.Votes:
        return [{ votesCount: 'desc' }, { createdAt: 'desc' }];
      case ProductSort.Newest:
        return [{ createdAt: 'desc' }];
      default:
        // Default storefront ordering: winner first, then most recent week.
        return [{ isCurrentWinner: 'desc' }, { weekNumber: 'desc' }, { createdAt: 'desc' }];
    }
  }

  async currentWinner() {
    const product = await this.prisma.product.findFirst({
      where: { isCurrentWinner: true, status: ProductStatus.published },
      include: { category: true, tags: true },
    });
    if (!product) throw new NotFoundException('No current winner is set');
    return product;
  }

  async pastWinners() {
    return this.prisma.product.findMany({
      where: { isCurrentWinner: false, status: ProductStatus.published },
      include: { category: true, tags: true },
      orderBy: [{ weekNumber: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { category: true, tags: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.$transaction(async (tx) => {
      if (dto.isCurrentWinner) {
        await tx.product.updateMany({
          where: { isCurrentWinner: true },
          data: { isCurrentWinner: false },
        });
      }
      return tx.product.create({
        data: {
          slug: await this.uniqueSlug(slugify(dto.name)),
          name: dto.name,
          tagline: dto.tagline,
          description: dto.description,
          imageUrl: dto.imageUrl,
          images: dto.images ?? [],
          properties: (dto.properties ?? {}) as Prisma.InputJsonValue,
          categoryId: dto.categoryId ?? (await this.defaultCategoryId(tx)),
          link: dto.link,
          price: dto.price,
          stock: dto.stock,
          weekNumber: dto.weekNumber,
          year: dto.year,
          isCurrentWinner: dto.isCurrentWinner ?? false,
          status: dto.status ?? ProductStatus.published,
          tags: dto.tagIds?.length ? { connect: dto.tagIds.map((id) => ({ id })) } : undefined,
        },
        include: { category: true, tags: true },
      });
    });

    this.events.emit(DomainEvent.ProductCreated, {
      productId: product.id,
      name: product.name,
      slug: product.slug,
    } satisfies ProductCreatedEvent);

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isCurrentWinner) {
        await tx.product.updateMany({
          where: { isCurrentWinner: true, NOT: { id } },
          data: { isCurrentWinner: false },
        });
      }
      const { tagIds, properties, ...rest } = dto;
      return tx.product.update({
        where: { id },
        data: {
          ...rest,
          properties: properties as Prisma.InputJsonValue | undefined,
          tags: tagIds ? { set: tagIds.map((id) => ({ id })) } : undefined,
        },
        include: { category: true, tags: true },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete: archive rather than hard-delete (orders reference products).
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.archived, isCurrentWinner: false },
    });
  }

  /** Validate an uploaded image and return its file extension. */
  private validateImage(file?: UploadedImage): string {
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');
    const ext = IMAGE_EXT[file.mimetype];
    if (!ext) throw new BadRequestException('Unsupported image type (use jpeg, png, webp, gif or svg)');
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException('Image exceeds 5 MB');
    return ext;
  }

  /**
   * Upload an image to object storage and return its URL — NOT attached to any
   * product. Used by the admin to upload images while creating a product (before
   * it exists) and to build a gallery.
   */
  async uploadFile(file?: UploadedImage): Promise<{ url: string }> {
    const ext = this.validateImage(file);
    const key = `products/uploads/${Date.now()}-${randomUUID()}.${ext}`;
    const url = await this.storage.upload(key, file!.buffer, file!.mimetype);
    return { url };
  }

  /** Upload a product image to object storage and set it as the product's cover imageUrl. */
  async setImage(id: string, file?: UploadedImage) {
    const product = await this.findOne(id);
    const ext = this.validateImage(file);
    const key = `products/${product.slug}-${Date.now()}.${ext}`;
    const imageUrl = await this.storage.upload(key, file!.buffer, file!.mimetype);
    return this.prisma.product.update({ where: { id }, data: { imageUrl } });
  }

  private async defaultCategoryId(tx: Prisma.TransactionClient): Promise<string | undefined> {
    const c = await tx.category.findFirst({ where: { isDefault: true }, select: { id: true } });
    return c?.id;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base || 'product';
    let n = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { slugify } from '../common/slug.util';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: await this.uniqueSlug(slugify(dto.name)),
        propertySchema: (dto.propertySchema ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        propertySchema:
          dto.propertySchema === undefined
            ? undefined
            : (dto.propertySchema as unknown as Prisma.InputJsonValue),
      },
    });
  }

  private async ensureExists(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base || 'category';
    let n = 1;
    while (await this.prisma.category.findUnique({ where: { slug } })) slug = `${base}-${++n}`;
    return slug;
  }
}

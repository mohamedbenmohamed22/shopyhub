import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { slugify } from '../common/slug.util';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async create(dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: { name: dto.name, slug: await this.uniqueSlug(slugify(dto.name)), color: dto.color },
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    await this.ensureExists(id);
    return this.prisma.tag.update({ where: { id }, data: { name: dto.name, color: dto.color } });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Implicit m2m join rows are removed automatically.
    return this.prisma.tag.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const t = await this.prisma.tag.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tag not found');
    return t;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base || 'tag';
    let n = 1;
    while (await this.prisma.tag.findUnique({ where: { slug } })) slug = `${base}-${++n}`;
    return slug;
  }
}

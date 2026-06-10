import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  governorates() {
    return this.prisma.governorate.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
  }
}

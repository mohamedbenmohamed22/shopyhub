import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  /**
   * Create an admin account. The first account ever created is forced to the
   * `admin` role (bootstrap); subsequent ones default to `staff` unless the
   * caller (already an admin, enforced by RegisterGuard) specifies otherwise.
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const isBootstrap = (await this.prisma.adminUser.count()) === 0;
    const role = isBootstrap ? AdminRole.admin : (dto.role ?? AdminRole.staff);

    const user = await this.prisma.adminUser.create({
      data: { email, passwordHash: await bcrypt.hash(dto.password, 10), role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return user;
  }

  async me(id: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}

import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../jwt.strategy';

/**
 * Gate for admin registration:
 *   - If NO admin exists yet → allow (bootstrap the first account).
 *   - Otherwise → require a valid JWT belonging to an `admin` (not `staff`).
 *
 * This prevents an open self-serve endpoint from minting admins, while still
 * letting a fresh deployment create its first account without a chicken-and-egg.
 */
@Injectable()
export class RegisterGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const adminCount = await this.prisma.adminUser.count();
    if (adminCount === 0) return true; // bootstrap path — open

    // Authenticated path: validate the JWT, then require the admin role.
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;

    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (user?.role !== AdminRole.admin) {
      throw new ForbiddenException('Only an admin can create new admin accounts');
    }
    return true;
  }
}

import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restrict a route to specific admin roles. Use with RolesGuard. */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

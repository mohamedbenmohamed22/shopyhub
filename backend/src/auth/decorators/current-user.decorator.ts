import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../jwt.strategy';

/** Injects the authenticated admin (set by JwtStrategy) into a handler param. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);

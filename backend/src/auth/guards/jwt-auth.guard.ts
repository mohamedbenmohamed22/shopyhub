import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects a route — requires a valid admin JWT in the Authorization header. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

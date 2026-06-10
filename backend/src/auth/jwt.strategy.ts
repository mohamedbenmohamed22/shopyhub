import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'ac9b2ac624921160d971af57f769ee9611fdefa076fcd37b9610c89b23274a3c',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}

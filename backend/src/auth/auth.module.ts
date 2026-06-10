import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RegisterGuard } from './guards/register.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret',
        // jsonwebtoken types expiresIn as a number | template-literal string;
        // cast the env value (e.g. "1d") to satisfy the stricter v11 typing.
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '1d') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RegisterGuard],
  exports: [AuthService],
})
export class AuthModule {}

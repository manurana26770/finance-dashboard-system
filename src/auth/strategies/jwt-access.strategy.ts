import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { StatusValue } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

type AccessTokenPayload = {
  sub: number;
  email: string;
  role: AuthenticatedUser['role'];
  status: AuthenticatedUser['status'];
  sessionVersion: number;
};

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.ACCESS_TOKEN_SECRET ||
        process.env.JWT_SECRET ||
        'dev-access-secret',
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (!user.isActive || user.status !== StatusValue.active) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (payload.sessionVersion !== user.sessionVersion) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    return {
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      sessionVersion: user.sessionVersion,
    };
  }
}
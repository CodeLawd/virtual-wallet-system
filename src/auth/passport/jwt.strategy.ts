import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // payload contains userId, tenantId, email from AuthService.login
    const user = await this.usersService.findByIdAndTenantId(
      payload.userId,
      payload.tenantId,
    );
    if (!user) {
      throw new UnauthorizedException('User not found or invalid token.');
    }
    // Attach tenantId and userId to the request for later use by guards/decorators
    return {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
    };
  }
}

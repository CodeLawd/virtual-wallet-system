import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(
    username: string,
    password: string,
    tenantId: string,
  ): Promise<any> {
    const payload = { email: username, password, tenantId };

    const user = await this.authService.login(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

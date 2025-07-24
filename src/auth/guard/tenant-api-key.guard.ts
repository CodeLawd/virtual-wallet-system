import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TenantApiKeyGuard extends AuthGuard('tenant-api-key') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          "Authentication failed. Please provide a valid 'x-tenant-api-key' header.",
        )
      );
    }
    return user;
  }
}

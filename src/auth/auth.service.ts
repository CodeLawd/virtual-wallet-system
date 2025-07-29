import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
  ) {}

  async register(tenantApiKey: string, registerAuthDto: any): Promise<any> {
    const tenant = await this.tenantsService.findByApiKey(tenantApiKey);
    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant API key.');
    }

    const existingUser = await this.usersService.findByEmailAndTenantId(
      registerAuthDto.email,
      tenant.id,
    );
    if (existingUser) {
      throw new BadRequestException(
        'User with this email already exists for this tenant.',
      );
    }

    const user = await this.usersService.create(tenant.id, registerAuthDto);

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async login(loginAuthDto: any): Promise<any> {
    const { email, password, tenantId } = loginAuthDto;

    const user = await this.usersService.findByEmailAndTenantId(
      email,
      tenantId,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}

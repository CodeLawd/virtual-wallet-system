import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { TenantsService } from '../../tenants/tenants.service';
import { Request } from 'express';

@Injectable()
export class TenantApiKeyStrategy extends PassportStrategy(Strategy, 'tenant-api-key') {
  constructor(private tenantsService: TenantsService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const apiKey = req.headers['x-tenant-api-key'] as string;
    
    if (!apiKey) {
      throw new UnauthorizedException(
        "Authentication failed. Please provide a valid 'x-tenant-api-key' header."
      );
    }

    try {
      const tenant = await this.tenantsService.findByApiKey(apiKey);
      if (!tenant) {
        throw new UnauthorizedException(
          "Authentication failed. Invalid API key."
        );
      }
      
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        apiKey: tenant.apiKey
      };
    } catch (error) {
      throw new UnauthorizedException(
        "Authentication failed. Invalid API key."
      );
    }
  }
}
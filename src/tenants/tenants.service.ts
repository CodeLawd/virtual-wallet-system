import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { v4 as uuidv4 } from 'uuid';
import { PostgresErrorCode } from '../common/constants/postgres-error-codes.enum';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto, TenantResponseDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  private tenantsRepository: Repository<Tenant>; // Inject Tenant repository

  constructor(@InjectRepository(Tenant) tenantsRepository: Repository<Tenant>) {
    this.tenantsRepository = tenantsRepository;
  }

  async create(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    const { name } = createTenantDto;
    const apiKey = uuidv4(); // Simple API key generation

    const newTenant = this.tenantsRepository.create({ name, apiKey });

    try {
      const tenant = await this.tenantsRepository.save(newTenant);
      return {
        id: tenant.id,
        name: tenant.name,
        apiKey: tenant.apiKey,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      };
    } catch (error) {
      if (error.code === PostgresErrorCode.UniqueViolation) {
        throw new ConflictException(
          `Tenant with name '${name}' already exists.`,
        );
      }
      throw error;
    }
  }

  async findByApiKey(apiKey: string): Promise<TenantResponseDto | null> {
    const tenant = await this.tenantsRepository.findOneBy({ apiKey });
    if (!tenant) {
      return null;
    }
    return {
      id: tenant.id,
      name: tenant.name,
      apiKey: tenant.apiKey,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async findById(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantsRepository.findOneBy({ id });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found.`);
    }
    return {
      id: tenant.id,
      name: tenant.name,
      apiKey: tenant.apiKey,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}

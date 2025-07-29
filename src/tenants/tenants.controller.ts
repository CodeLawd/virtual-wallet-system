import { Controller, Post, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, TenantResponseDto } from './dto/create-tenant.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiBody({ type: CreateTenantDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The tenant has been successfully created.',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant with this name already exists.',
  })
  async create(@Body() createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.create(createTenantDto);
  }
}

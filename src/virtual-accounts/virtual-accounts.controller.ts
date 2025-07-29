import {
  Controller,
  Post,
  UseGuards,
  HttpStatus,
  Body,
  Request,
} from '@nestjs/common';
import { VirtualAccountsService } from './virtual-accounts.service';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { VirtualAccountResponseDto } from './dto/virtual-account-response.dto';
import { Tenant } from '../common/decorators/tenant.decorator';

@ApiTags('Virtual Accounts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('virtual-accounts')
export class VirtualAccountsController {
  constructor(
    private readonly virtualAccountsService: VirtualAccountsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new virtual account for a wallet' })
  @ApiBody({ type: CreateVirtualAccountDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Virtual account created successfully.',
    type: VirtualAccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or wallet not found.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Virtual account already exists for this wallet/provider.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async create(
    @Request() req: any,
    @Tenant() tenantId: string,
    @Body() createVirtualAccountDto: CreateVirtualAccountDto,
  ): Promise<any> {
    return this.virtualAccountsService.create(
      tenantId,
      req.user.userId,
      createVirtualAccountDto,
    );
  }
}

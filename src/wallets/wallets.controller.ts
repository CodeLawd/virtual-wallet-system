import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateWalletDto, WalletResponseDto } from './dto/create-wallet.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Tenant } from '../common/decorators/tenant.decorator';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';

@ApiTags('Wallets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet for the authenticated user' })
  @ApiBody({ type: CreateWalletDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The wallet has been successfully created.',
    type: WalletResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Wallet with this currency already exists for the user.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async create(
    req: any,
    @Tenant() tenantId: string,
    @Body() createWalletDto: CreateWalletDto,
  ): Promise<WalletResponseDto> {
    return this.walletsService.create(
      req.user.userId,
      tenantId,
      createWalletDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all wallets for the authenticated user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of wallets retrieved successfully.',
    type: [WalletResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findAll(
    req: any,
    @Tenant() tenantId: string,
  ): Promise<WalletResponseDto[]> {
    return this.walletsService.findAllByUserId(req.user.userId, tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Get a specific wallet by ID for the authenticated user's tenant",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet details retrieved successfully.',
    type: WalletResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Wallet not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findOne(
    @Param('id') id: string,
    @Tenant() tenantId: string,
  ): Promise<WalletResponseDto> {
    return this.walletsService.findByTenantIdAndId(id, tenantId);
  }
}

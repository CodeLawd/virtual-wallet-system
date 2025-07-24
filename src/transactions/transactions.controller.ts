import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import type { TransactionsService } from './transactions.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { Tenant } from '../common/decorators/tenant.decorator';
import { IdempotencyInterceptor } from '../idempotency/idempotency.interceptor';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('deposit')
  @UseInterceptors(IdempotencyInterceptor) // Apply idempotency interceptor
  @ApiOperation({ summary: 'Initiate a deposit into a wallet' })
  @ApiBody({ type: CreateDepositDto })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to ensure the request is processed only once.',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Deposit initiated successfully.',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or insufficient funds.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Idempotent request already processed or in progress.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async deposit(
    req: any,
    @Tenant() tenantId: string,
    @Body() createDepositDto: CreateDepositDto,
    @ApiHeader({ name: 'idempotency-key' }) idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.processDeposit(
      tenantId,
      req.user.userId,
      createDepositDto,
      idempotencyKey,
    );
  }

  @Post('withdraw')
  @UseInterceptors(IdempotencyInterceptor) // Apply idempotency interceptor
  @ApiOperation({ summary: 'Initiate a withdrawal from a wallet' })
  @ApiBody({ type: CreateWithdrawalDto })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to ensure the request is processed only once.',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Withdrawal initiated successfully.',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or insufficient funds.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Idempotent request already processed or in progress.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async withdraw(
    req: any,
    @Tenant() tenantId: string,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
    @ApiHeader({ name: 'idempotency-key' }) idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.processWithdrawal(
      tenantId,
      req.user.userId,
      createWithdrawalDto,
      idempotencyKey,
    );
  }

  @Post('transfer')
  @UseInterceptors(IdempotencyInterceptor) // Apply idempotency interceptor
  @ApiOperation({ summary: 'Initiate an internal transfer between wallets' })
  @ApiBody({ type: CreateTransferDto })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to ensure the request is processed only once.',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transfer processed successfully.',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or insufficient funds.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Idempotent request already processed or in progress.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async transfer(
    req: any,
    @Tenant() tenantId: string,
    @Body() createTransferDto: CreateTransferDto,
    @ApiHeader({ name: 'idempotency-key' }) idempotencyKey: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.processTransfer(
      tenantId,
      req.user.userId,
      createTransferDto,
      idempotencyKey,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get transaction history for the authenticated user',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description:
      'Optional: Filter transactions by a specific user ID within the tenant. If not provided, returns all transactions for the tenant.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction history retrieved successfully.',
    type: [TransactionResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async findAll(
    @Tenant() tenantId: string,
    @Query('userId') userId?: string, // Allow filtering by userId
  ): Promise<TransactionResponseDto[]> {
    // If userId is not provided, it means the request is from a tenant-level admin or system,
    // and they want all transactions for the tenant.
    // If userId is provided, it filters for that specific user's transactions.
    return this.transactionsService.findAllByTenantId(tenantId, userId);
  }
}

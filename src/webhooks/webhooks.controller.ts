import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TenantApiKeyGuard } from 'src/auth/guard/tenant-api-key.guard';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TenantApiKeyGuard)
  @ApiOperation({ summary: 'Receive webhook events from payment providers' })
  @ApiParam({
    name: 'provider',
    description:
      'Name of the payment provider (e.g., paystack, flutterwave, stripe)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'Raw webhook payload from the payment provider.',
      example: {
        event: 'charge.success',
        data: {
          id: 'mock_charge_id',
          amount: 10000,
          currency: 'NGN',
          reference: 'PS_TXN_12345',
          metadata: {
            context: {
              transactionId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
              walletId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
              tenantId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            },
          },
        },
      },
    },
  })
  @ApiSecurity('tenant-api-key') // Document the API key header
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook received and queued for processing.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid tenant API key or webhook signature.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to process webhook.',
  })
  async receiveWebhook(
    req: any,
    @Param('provider') provider: string,
    @Body() payload: Record<string, any>,
  ): Promise<any> {
    const tenantId = req.tenantId; // tenantId is set by TenantApiKeyGuard
    // In a real scenario, you would also verify the webhook signature here
    // using the provider's secret key and the raw request body.
    return this.webhooksService.processIncomingWebhook(
      tenantId,
      provider,
      payload,
    );
  }

  @Post('replay/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Replay a failed or specific webhook event by its ID',
  })
  @ApiParam({ name: 'id', description: 'ID of the webhook event to replay' })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook event replayed successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Webhook event not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to replay webhook.',
  })
  async replayWebhook(@Param('id') id: string, req: any): Promise<any> {
    const tenantId = req.user.tenantId; // tenantId from JWT
    return this.webhooksService.replayWebhookEvent(id, tenantId);
  }
}

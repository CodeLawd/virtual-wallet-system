import { Injectable, type ExecutionContext } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected getTracker(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest()
    // Assuming tenantId is attached to the request by a guard (e.g., JwtAuthGuard or TenantApiKeyGuard)
    // This ensures rate limiting is applied per tenant.
    // If tenantId is not available, fallback to IP or throw an error.
    return request.tenantId || request.ip
  }
}

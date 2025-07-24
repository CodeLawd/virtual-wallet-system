import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

export const Tenant = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  // Assuming tenantId is attached to the request by a guard (e.g., JwtAuthGuard or TenantApiKeyGuard)
  return request.tenantId
})

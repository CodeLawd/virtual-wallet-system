import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { UserResponseDto } from './dto/user-response.dto';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import { Request as ExpressRequrest } from 'express';

interface AuthenticatedRequest extends ExpressRequrest {
  user: {
    userId: string;
    tenantId: string;
    email: string;
  };
}

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get current authenticated user's details" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User details retrieved successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async getMe(
    @Request() req: AuthenticatedRequest,
    @Tenant() tenantId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findByIdAndTenantId(req.user.userId, tenantId);
  }
}

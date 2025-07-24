import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token') // Document JWT authentication
@UseGuards(JwtAuthGuard) // Protect all routes in this controller with JWT
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
    req: Request,
    @Tenant() tenantId: string,
  ): Promise<UserResponseDto> {
    // req.user is populated by JwtAuthGuard
    return this.usersService.findByIdAndTenantId(req.user.userId, tenantId);
  }
}

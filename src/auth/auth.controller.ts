import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { TenantApiKeyGuard } from './guard/tenant-api-key.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(TenantApiKeyGuard) // Use TenantApiKeyGuard for registration
  @ApiOperation({ summary: 'Register a new user for a tenant' })
  @ApiBody({})
  @ApiSecurity('tenant-api-key') // Document the API key header
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid tenant API key.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User with this email already exists for this tenant.',
  })
  async register(@Body() registerAuthDto: any, req: any): Promise<any> {
    const tenantApiKey = req.headers['tenant-api-key']; // tenantApiKey is set by TenantApiKeyGuard
    return this.authService.register(tenantApiKey, registerAuthDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and receive a JWT' })
  @ApiBody({})
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged in successfully.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials.',
  })
  async login(@Body() loginAuthDto: any): Promise<any> {
    return this.authService.login(loginAuthDto);
  }
}

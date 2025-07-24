import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../entities/user.entity'; // Import User entity
import type { CreateUserDto } from './dto/create-user.dto';
import type { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcrypt';
import { PostgresErrorCode } from '../common/constants/postgres-error-codes.enum';

@Injectable()
export class UsersService {
  private usersRepository: Repository<User>; // Inject User repository

  constructor(usersRepository: Repository<User>) {
    this.usersRepository = usersRepository;
  }

  async create(
    tenantId: string,
    createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const { email, password, firstName, lastName } = createUserDto;
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = this.usersRepository.create({
      tenantId,
      email,
      passwordHash,
      firstName,
      lastName,
    });

    try {
      const user = await this.usersRepository.save(newUser);
      return {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error.code === PostgresErrorCode.UniqueViolation) {
        throw new ConflictException(
          `User with email '${email}' already exists for this tenant.`,
        );
      }
      throw error;
    }
  }

  async findByEmailAndTenantId(
    email: string,
    tenantId: string,
  ): Promise<User | null> {
    const user = await this.usersRepository.findOneBy({ email, tenantId });
    return user;
  }

  async findByIdAndTenantId(
    id: string,
    tenantId: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOneBy({ id, tenantId });
    if (!user) {
      throw new NotFoundException(
        `User with ID '${id}' not found for this tenant.`,
      );
    }
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

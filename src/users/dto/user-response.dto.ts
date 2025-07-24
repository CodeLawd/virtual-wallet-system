import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the tenant the user belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  tenantId: string;

  @ApiProperty({
    description: "User's email address",
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({ description: "User's first name", example: 'John' })
  firstName: string;

  @ApiProperty({ description: "User's last name", example: 'Doe' })
  lastName: string;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt: Date;
}

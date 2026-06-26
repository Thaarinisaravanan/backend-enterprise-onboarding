import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';

export class RegisterDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail() @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString() @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({ example: 'Alice' })
  @IsString() @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString() @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'company-alpha' })
  @IsString() @IsNotEmpty()
  companySlug: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'MANAGER', 'VIEWER'], default: 'VIEWER' })
  @IsEnum(['ADMIN', 'MANAGER', 'VIEWER']) @IsOptional()
  role?: Role;
}

export class LoginDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail() @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString() @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'company-alpha' })
  @IsString() @IsNotEmpty()
  companySlug: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() tokenType: string;
  @ApiProperty() expiresIn: string;
  @ApiProperty() user: {
    id: string; email: string; firstName: string;
    lastName: string; role: Role; companyId: string;
  };
}

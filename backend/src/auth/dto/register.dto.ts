import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'boss@potw.tn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'supersecret', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    enum: AdminRole,
    example: AdminRole.staff,
    description: "Defaults to 'staff'; the bootstrap (first) account is forced to 'admin'.",
  })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}

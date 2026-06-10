import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'Trending' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: '#f59e0b', description: 'Hex colour for the badge' })
  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'color must be a hex value like #f59e0b' })
  color?: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}

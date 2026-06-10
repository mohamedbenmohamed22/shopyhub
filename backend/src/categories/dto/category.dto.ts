import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PropertyDefDto {
  @ApiProperty({ example: 'platform' })
  @IsString()
  @MinLength(1)
  key: string;

  @ApiProperty({ example: 'Platform' })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty({ enum: ['text', 'number', 'boolean'], example: 'text' })
  @IsIn(['text', 'number', 'boolean'])
  type: 'text' | 'number' | 'boolean';
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Hardware' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ type: [PropertyDefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyDefDto)
  propertySchema?: PropertyDefDto[];
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

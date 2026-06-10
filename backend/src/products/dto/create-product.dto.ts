import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'Lumina AI' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Transform your ideas into stunning visuals instantly' })
  @IsString()
  @MinLength(2)
  tagline: string;

  @ApiProperty({ example: 'A revolutionary design tool powered by machine learning.' })
  @IsString()
  @MinLength(2)
  description: string;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800' })
  // require_tld:false so local MinIO URLs (http://localhost:9090/...) are accepted.
  @IsUrl({ require_tld: false })
  imageUrl: string;

  @ApiPropertyOptional({ type: [String], description: 'Additional gallery image URLs' })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  images?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Tag ids to attach' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ format: 'uuid', description: 'Category id (falls back to the default category if omitted)' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Property values (category-inherited + product-specific extensions)',
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ example: 149, description: 'Price in TND' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 100, description: 'Units available for ordering' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weekNumber?: number;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isCurrentWinner?: boolean;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.published })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

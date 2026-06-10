import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum ProductSort {
  Newest = 'newest',
  PriceAsc = 'price_asc',
  PriceDesc = 'price_desc',
  Votes = 'votes',
}

export enum TagMatchMode {
  Any = 'any', // product has at least one of the tags
  All = 'all', // product has every tag
}

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

export class QueryProductsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string; // free-text on name/tagline

  @IsOptional()
  @IsString()
  category?: string; // slug

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /**
   * Tag slugs to filter by. Accepts a comma-separated string (`?tags=a,b`) or
   * repeated params (`?tags=a&tags=b`). A product matches if it has ANY of them.
   */
  @IsOptional()
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : String(value).split(','))
      .map((v: string) => v.trim())
      .filter(Boolean),
  )
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** How to combine multiple tags. Defaults to "any". */
  @IsOptional()
  @IsEnum(TagMatchMode)
  tagMode?: TagMatchMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  /** When true, only products with stock > 0. */
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  week?: number;

  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus; // admin only
}

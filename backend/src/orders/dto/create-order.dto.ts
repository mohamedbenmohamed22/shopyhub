import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CustomerDto {
  @ApiProperty({ example: 'Ahmed Ben Ali' })
  @IsString()
  @MinLength(2)
  fullName: string;

  // Tunisian phone: optional +216 prefix, then 2/4/5/9 + 7 digits.
  @ApiProperty({ example: '+21620123456', description: 'Tunisian number, pattern ^(\\+216)?[2459]\\d{7}$' })
  @Matches(/^(\+216)?[2459]\d{7}$/, {
    message: 'phone must be a valid Tunisian number, e.g. +21620123456',
  })
  phone: string;

  @ApiProperty({ example: 1, description: 'Governorate id from GET /reference/governorates' })
  @Type(() => Number)
  @IsInt()
  governorateId: number;

  @ApiProperty({ example: '12 Rue de Carthage, Tunis 1000' })
  @IsString()
  @MinLength(4)
  address: string;
}

export class OrderLineDto {
  @ApiProperty({ example: 'b3c1f2a4-5d6e-7f80-9a1b-2c3d4e5f6071', format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}

export class CreateOrderDto {
  // ---- Cart checkout: one or more line items ----
  @ApiPropertyOptional({ type: [OrderLineDto], description: 'Cart line items (preferred)' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items?: OrderLineDto[];

  // ---- Legacy single-product fields (still supported) ----
  @ApiPropertyOptional({ example: 'b3c1f2a4-5d6e-7f80-9a1b-2c3d4e5f6071', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  quantity?: number;

  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiPropertyOptional({ example: 'Call after 6pm' })
  @IsOptional()
  @IsString()
  notes?: string;
}

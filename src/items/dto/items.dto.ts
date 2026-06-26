import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export type ItemStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export class CreateItemDto {
  @ApiProperty({ example: 'Widget Pro' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'WGT-001' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  sku: string;

  @ApiProperty({ example: 100 })
  @IsInt() @Min(0) @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional()
  @IsString() @IsOptional() @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsInt() @Min(0) @IsOptional() @Type(() => Number)
  threshold?: number;
}

export class UpdateItemDto extends PartialType(CreateItemDto) {}

export class AdjustQuantityDto {
  @ApiProperty({ example: -5, description: 'Positive to add, negative to remove' })
  @IsInt() @Type(() => Number)
  delta: number;

  @ApiProperty({ example: 'Sold 5 units' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason: string;
}

export class ItemQueryDto {
  @ApiPropertyOptional({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  @IsEnum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']) @IsOptional()
  status?: ItemStatus;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsInt() @Min(0) @IsOptional() @Type(() => Number)
  minQuantity?: number;

  @ApiPropertyOptional()
  @IsInt() @Min(0) @IsOptional() @Type(() => Number)
  maxQuantity?: number;

  @ApiPropertyOptional()
  @IsDateString() @IsOptional()
  createdAfter?: string;

  @ApiPropertyOptional()
  @IsDateString() @IsOptional()
  createdBefore?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsInt() @Min(1) @IsOptional() @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 'createdAt:desc' })
  @IsString() @IsOptional()
  sort?: string;
}

export class ItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() sku: string;
  @ApiProperty() quantity: number;
  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] }) status: ItemStatus;
  @ApiPropertyOptional() category?: string | null;
  @ApiProperty() threshold: number;
  @ApiProperty() companyId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class InventorySummaryDto {
  @ApiProperty() companyId: string;
  @ApiProperty() total: number;
  @ApiProperty() inStock: number;
  @ApiProperty() lowStock: number;
  @ApiProperty() outOfStock: number;
  @ApiProperty() cachedAt: string;
}

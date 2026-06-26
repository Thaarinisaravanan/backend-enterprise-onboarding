import { CreateItemDto, UpdateItemDto, ItemQueryDto } from '../dto/items.dto';
import { PaginatedResult } from '../../common/interceptors/transform.interceptor';

export const ITEMS_REPOSITORY = Symbol('IItemsRepository');

export interface ItemEntity {
  id: string;
  title: string;
  description: string | null;
  sku: string;
  quantity: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  category: string | null;
  threshold: number;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IItemsRepository {
  findAll(companyId: string, query: ItemQueryDto): Promise<PaginatedResult<ItemEntity>>;
  findById(companyId: string, id: string): Promise<ItemEntity | null>;
  findBySku(companyId: string, sku: string): Promise<ItemEntity | null>;
  create(companyId: string, dto: CreateItemDto): Promise<ItemEntity>;
  update(companyId: string, id: string, dto: UpdateItemDto): Promise<ItemEntity>;
  adjustQuantity(
    companyId: string,
    id: string,
    delta: number,
    userId: string,
    reason: string,
    requestId?: string,
  ): Promise<ItemEntity>;
  softDelete(companyId: string, id: string, userId: string, requestId?: string): Promise<void>;
  getSummary(companyId: string): Promise<Record<string, number>>;
}

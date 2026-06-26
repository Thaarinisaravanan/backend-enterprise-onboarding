import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ITEMS_REPOSITORY, IItemsRepository, ItemEntity } from './repository/items.repository.interface';
import { PaginatedResult } from '../common/interceptors/transform.interceptor';
import {
  CreateItemDto,
  UpdateItemDto,
  AdjustQuantityDto,
  ItemQueryDto,
  ItemResponseDto,
  InventorySummaryDto,
} from './dto/items.dto';
import { ConflictException, NotFoundException } from '../common/exceptions/app.exception';
import { RequestContext } from '../common/middleware/request-context.middleware';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ItemsService {
  constructor(
    @Inject(ITEMS_REPOSITORY)
    private readonly itemsRepository: IItemsRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @InjectQueue('low-stock-alerts')
    private readonly lowStockQueue: Queue,
    @InjectPinoLogger(ItemsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async findAll(companyId: string, query: ItemQueryDto): Promise<PaginatedResult<ItemResponseDto>> {
    const result = await this.itemsRepository.findAll(companyId, query);
    return { data: result.data.map(this.toResponseDto), meta: result.meta };
  }

  async findById(companyId: string, id: string): Promise<ItemResponseDto> {
    const item = await this.itemsRepository.findById(companyId, id);
    if (!item) throw new NotFoundException('Item', id);
    return this.toResponseDto(item);
  }

  async create(companyId: string, dto: CreateItemDto, userId: string): Promise<ItemResponseDto> {
    const existing = await this.itemsRepository.findBySku(companyId, dto.sku);
    if (existing) throw new ConflictException('Item', 'SKU', dto.sku);
    const item = await this.itemsRepository.create(companyId, dto);
    await this.invalidateSummaryCache(companyId);
    this.logger.info({ companyId, itemId: item.id, sku: item.sku }, 'Item created');
    return this.toResponseDto(item);
  }

  async update(companyId: string, id: string, dto: UpdateItemDto, userId: string): Promise<ItemResponseDto> {
    const existing = await this.itemsRepository.findById(companyId, id);
    if (!existing) throw new NotFoundException('Item', id);
    if (dto.sku && dto.sku !== existing.sku) {
      const skuConflict = await this.itemsRepository.findBySku(companyId, dto.sku);
      if (skuConflict) throw new ConflictException('Item', 'SKU', dto.sku);
    }
    const item = await this.itemsRepository.update(companyId, id, dto);
    await this.invalidateSummaryCache(companyId);
    return this.toResponseDto(item);
  }

  async adjustQuantity(companyId: string, id: string, dto: AdjustQuantityDto, userId: string): Promise<ItemResponseDto> {
    const existing = await this.itemsRepository.findById(companyId, id);
    if (!existing) throw new NotFoundException('Item', id);
    const requestId = RequestContext.getRequestId();
    const item = await this.itemsRepository.adjustQuantity(companyId, id, dto.delta, userId, dto.reason, requestId);
    await this.invalidateSummaryCache(companyId);
    const threshold = item.threshold ?? this.configService.get<number>('inventory.lowStockThreshold') ?? 10;
    if (item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK') {
      await this.lowStockQueue.add(
        'low-stock-alert',
        { itemId: item.id, companyId, sku: item.sku, title: item.title, quantity: item.quantity, threshold, status: item.status },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: 100 },
      );
    }
    return this.toResponseDto(item);
  }

  async remove(companyId: string, id: string, userId: string): Promise<void> {
    const existing = await this.itemsRepository.findById(companyId, id);
    if (!existing) throw new NotFoundException('Item', id);
    const requestId = RequestContext.getRequestId();
    await this.itemsRepository.softDelete(companyId, id, userId, requestId);
    await this.invalidateSummaryCache(companyId);
  }

  async getSummary(companyId: string): Promise<InventorySummaryDto> {
    const cacheKey = `cache:items:summary:${companyId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached) as InventorySummaryDto;
    const summary = await this.itemsRepository.getSummary(companyId);
    const total = (summary['IN_STOCK'] ?? 0) + (summary['LOW_STOCK'] ?? 0) + (summary['OUT_OF_STOCK'] ?? 0);
    const result: InventorySummaryDto = {
      companyId, total,
      inStock: summary['IN_STOCK'] ?? 0,
      lowStock: summary['LOW_STOCK'] ?? 0,
      outOfStock: summary['OUT_OF_STOCK'] ?? 0,
      cachedAt: new Date().toISOString(),
    };
    const ttl = this.configService.get<number>('cache.ttlSeconds') ?? 60;
    await this.redisService.set(cacheKey, JSON.stringify(result), ttl);
    return result;
  }

  private async invalidateSummaryCache(companyId: string): Promise<void> {
    await this.redisService.del(`cache:items:summary:${companyId}`);
  }

  private toResponseDto(item: ItemEntity): ItemResponseDto {
    return {
      id: item.id, title: item.title, description: item.description,
      sku: item.sku, quantity: item.quantity, status: item.status as any,
      category: item.category, threshold: item.threshold,
      companyId: item.companyId, createdAt: item.createdAt, updatedAt: item.updatedAt,
    };
  }
}

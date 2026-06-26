import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IItemsRepository } from './items.repository.interface';
import { CreateItemDto, UpdateItemDto, ItemQueryDto } from '../dto/items.dto';
import { PaginatedResult } from '../../common/interceptors/transform.interceptor';
import { BadRequestException, InternalServerException } from '../../common/exceptions/app.exception';

// Use string literals instead of Prisma enums to avoid generation issues
type ItemStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'INVENTORY_ADJUSTMENT';

interface Item {
  id: string;
  title: string;
  description: string | null;
  sku: string;
  quantity: number;
  status: ItemStatus;
  category: string | null;
  threshold: number;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

@Injectable()
export class PrismaItemsRepository implements IItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: ItemQueryDto): Promise<PaginatedResult<Item>> {
    this.assertCompanyId(companyId);
    const limit = query.limit ?? 20;
    const take = limit + 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      companyId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' },
      }),
      ...(query.minQuantity !== undefined && { quantity: { gte: query.minQuantity } }),
      ...(query.maxQuantity !== undefined && {
        quantity: {
          ...(query.minQuantity !== undefined ? { gte: query.minQuantity } : {}),
          lte: query.maxQuantity,
        },
      }),
      ...(query.createdAfter && { createdAt: { gte: new Date(query.createdAfter) } }),
      ...(query.createdBefore && {
        createdAt: {
          ...(query.createdAfter ? { gte: new Date(query.createdAfter) } : {}),
          lte: new Date(query.createdBefore),
        },
      }),
    };

    const orderBy = this.parseSort(query.sort);

    const items = await this.prisma.item.findMany({
      where,
      take,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      orderBy,
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

    return { data: data as Item[], meta: { hasMore, nextCursor } };
  }

  async findById(companyId: string, id: string): Promise<Item | null> {
    this.assertCompanyId(companyId);
    return this.prisma.item.findFirst({
      where: { id, companyId, deletedAt: null },
    }) as Promise<Item | null>;
  }

  async findBySku(companyId: string, sku: string): Promise<Item | null> {
    this.assertCompanyId(companyId);
    return this.prisma.item.findFirst({
      where: { sku, companyId, deletedAt: null },
    }) as Promise<Item | null>;
  }

  async create(companyId: string, dto: CreateItemDto): Promise<Item> {
    this.assertCompanyId(companyId);
    const quantity = dto.quantity;
    const threshold = dto.threshold ?? 10;
    const status = this.computeStatus(quantity, threshold);

    return this.prisma.item.create({
      data: {
        title: dto.title,
        description: dto.description,
        sku: dto.sku,
        quantity,
        status,
        category: dto.category,
        threshold,
        companyId,
      },
    }) as Promise<Item>;
  }

  async update(companyId: string, id: string, dto: UpdateItemDto): Promise<Item> {
    this.assertCompanyId(companyId);
    const existing = await this.prisma.item.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null as unknown as Item;

    const quantity = dto.quantity ?? existing.quantity;
    const threshold = dto.threshold ?? existing.threshold;
    const status = this.computeStatus(quantity, threshold);

    return this.prisma.item.update({
      where: { id },
      data: { ...dto, status },
    }) as Promise<Item>;
  }

  async adjustQuantity(
    companyId: string,
    id: string,
    delta: number,
    userId: string,
    reason: string,
    requestId?: string,
  ): Promise<Item> {
    this.assertCompanyId(companyId);

    return this.prisma.$transaction(async (tx: any) => {
      const item = await tx.item.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!item) return null as unknown as Item;

      const newQuantity = item.quantity + delta;
      if (newQuantity < 0) {
        throw new BadRequestException(
          `Adjustment would result in negative quantity (current: ${item.quantity}, delta: ${delta})`,
          'NEGATIVE_QUANTITY',
        );
      }

      const status = this.computeStatus(newQuantity, item.threshold);

      const updatedItem = await tx.item.update({
        where: { id },
        data: { quantity: newQuantity, status },
      });

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          entityType: 'Item',
          entityId: id,
          action: 'INVENTORY_ADJUSTMENT' as AuditAction,
          before: { quantity: item.quantity, status: item.status },
          after: { quantity: newQuantity, status },
          metadata: { delta, reason },
          requestId,
        },
      });

      return updatedItem as Item;
    });
  }

  async softDelete(
    companyId: string,
    id: string,
    userId: string,
    requestId?: string,
  ): Promise<void> {
    this.assertCompanyId(companyId);

    await this.prisma.$transaction(async (tx: any) => {
      const item = await tx.item.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!item) return;

      await tx.item.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          entityType: 'Item',
          entityId: id,
          action: 'DELETE' as AuditAction,
          before: { title: item.title, sku: item.sku, quantity: item.quantity },
          requestId,
        },
      });
    });
  }

  async getSummary(companyId: string): Promise<Record<ItemStatus, number>> {
    this.assertCompanyId(companyId);

    const results = await this.prisma.item.groupBy({
      by: ['status'],
      where: { companyId, deletedAt: null },
      _count: { status: true },
    });

    const summary: Record<ItemStatus, number> = {
      IN_STOCK: 0,
      LOW_STOCK: 0,
      OUT_OF_STOCK: 0,
    };

    for (const row of results) {
      summary[row.status as ItemStatus] = row._count.status;
    }

    return summary;
  }

  private computeStatus(quantity: number, threshold: number): ItemStatus {
    if (quantity === 0) return 'OUT_OF_STOCK';
    if (quantity <= threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  private assertCompanyId(companyId: string): void {
    if (!companyId) {
      throw new InternalServerException(
        'companyId is required for all item queries — CompanyContext not initialised',
      );
    }
  }

  private parseSort(sort?: string): object[] {
    if (!sort) return [{ createdAt: 'desc' }];
    const [field, direction] = sort.split(':');
    const allowed = ['createdAt', 'updatedAt', 'title', 'quantity', 'status'];
    if (!allowed.includes(field)) return [{ createdAt: 'desc' }];
    return [{ [field]: direction === 'asc' ? 'asc' : 'desc' }];
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { ItemStatus } from '@prisma/client';
import { ItemsService } from '../../src/items/items.service';
import { ITEMS_REPOSITORY, IItemsRepository } from '../../src/items/repository/items.repository.interface';
import { RedisService } from '../../src/redis/redis.service';
import { NotFoundException, ConflictException } from '../../src/common/exceptions/app.exception';
import { ItemFactory } from '../factories/item.factory';
import { PinoLogger } from 'nestjs-pino';

const COMPANY_ID = 'company-test-001';
const USER_ID = 'user-test-001';

describe('ItemsService', () => {
  let service: ItemsService;
  let repo: jest.Mocked<IItemsRepository>;
  let redisService: jest.Mocked<RedisService>;
  let lowStockQueue: { add: jest.Mock };

  beforeEach(async () => {
    ItemFactory.reset();

    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      adjustQuantity: jest.fn(),
      softDelete: jest.fn(),
      getSummary: jest.fn(),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      isHealthy: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<RedisService>;

    lowStockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    const pinoLoggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: ITEMS_REPOSITORY, useValue: repo },
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(10) } },
        { provide: getQueueToken('low-stock-alerts'), useValue: lowStockQueue },
        { provide: PinoLogger, useValue: pinoLoggerMock },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  // ──────────────────────────────────────────────
  // findById
  // ──────────────────────────────────────────────
  describe('findById', () => {
    it('returns a response DTO when item exists', async () => {
      const item = ItemFactory.createEntity({ companyId: COMPANY_ID });
      repo.findById.mockResolvedValue(item);

      const result = await service.findById(COMPANY_ID, item.id);

      expect(result.id).toBe(item.id);
      expect(result.companyId).toBe(COMPANY_ID);
      expect(repo.findById).toHaveBeenCalledWith(COMPANY_ID, item.id);
    });

    it('throws NotFoundException when item does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById(COMPANY_ID, 'nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('always passes companyId to the repository', async () => {
      repo.findById.mockResolvedValue(null);
      try {
        await service.findById(COMPANY_ID, 'any-id');
      } catch {
        // ignore NotFoundException
      }
      expect(repo.findById).toHaveBeenCalledWith(COMPANY_ID, 'any-id');
      // Must NOT be called without companyId
      expect(repo.findById).not.toHaveBeenCalledWith(undefined, 'any-id');
    });
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    it('creates an item when SKU is unique', async () => {
      const dto = ItemFactory.createDto();
      const entity = ItemFactory.createEntity({ companyId: COMPANY_ID, sku: dto.sku });
      repo.findBySku.mockResolvedValue(null);
      repo.create.mockResolvedValue(entity);

      const result = await service.create(COMPANY_ID, dto, USER_ID);

      expect(result.sku).toBe(entity.sku);
      expect(repo.create).toHaveBeenCalledWith(COMPANY_ID, dto);
      expect(redisService.del).toHaveBeenCalled(); // cache invalidated
    });

    it('throws ConflictException when SKU already exists', async () => {
      const dto = ItemFactory.createDto();
      repo.findBySku.mockResolvedValue(ItemFactory.createEntity({ sku: dto.sku }));

      await expect(service.create(COMPANY_ID, dto, USER_ID)).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // update
  // ──────────────────────────────────────────────
  describe('update', () => {
    it('updates the item when it exists', async () => {
      const existing = ItemFactory.createEntity({ companyId: COMPANY_ID });
      const updated = { ...existing, title: 'Updated Title' };
      repo.findById.mockResolvedValue(existing);
      repo.findBySku.mockResolvedValue(null);
      repo.update.mockResolvedValue(updated);

      const result = await service.update(COMPANY_ID, existing.id, { title: 'Updated Title' }, USER_ID);

      expect(result.title).toBe('Updated Title');
    });

    it('throws NotFoundException when item does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(COMPANY_ID, 'bad-id', {}, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new SKU conflicts with another item', async () => {
      const existing = ItemFactory.createEntity({ companyId: COMPANY_ID });
      const conflict = ItemFactory.createEntity({ companyId: COMPANY_ID, sku: 'CONFLICT' });
      repo.findById.mockResolvedValue(existing);
      repo.findBySku.mockResolvedValue(conflict);

      await expect(
        service.update(COMPANY_ID, existing.id, { sku: 'CONFLICT' }, USER_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────
  // adjustQuantity
  // ──────────────────────────────────────────────
  describe('adjustQuantity', () => {
    it('adjusts quantity and enqueues low-stock job when below threshold', async () => {
      const existing = ItemFactory.createEntity({ companyId: COMPANY_ID, quantity: 15 });
      const adjusted = { ...existing, quantity: 5, status: ItemStatus.LOW_STOCK };
      repo.findById.mockResolvedValue(existing);
      repo.adjustQuantity.mockResolvedValue(adjusted);

      await service.adjustQuantity(COMPANY_ID, existing.id, { delta: -10, reason: 'Sale' }, USER_ID);

      expect(repo.adjustQuantity).toHaveBeenCalledWith(
        COMPANY_ID,
        existing.id,
        -10,
        USER_ID,
        'Sale',
        undefined,
      );
      expect(lowStockQueue.add).toHaveBeenCalled();
    });

    it('does not enqueue job when stock is sufficient', async () => {
      const existing = ItemFactory.createEntity({ companyId: COMPANY_ID });
      const adjusted = { ...existing, quantity: 90, status: ItemStatus.IN_STOCK };
      repo.findById.mockResolvedValue(existing);
      repo.adjustQuantity.mockResolvedValue(adjusted);

      await service.adjustQuantity(COMPANY_ID, existing.id, { delta: -10, reason: 'Sale' }, USER_ID);

      expect(lowStockQueue.add).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if item does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.adjustQuantity(COMPANY_ID, 'bad-id', { delta: -1, reason: 'test' }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // getSummary — cache behaviour
  // ──────────────────────────────────────────────
  describe('getSummary', () => {
    it('returns cached summary when cache hit', async () => {
      const cachedData = JSON.stringify({
        companyId: COMPANY_ID,
        total: 3,
        inStock: 1,
        lowStock: 1,
        outOfStock: 1,
        cachedAt: new Date().toISOString(),
      });
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getSummary(COMPANY_ID);

      expect(result.total).toBe(3);
      expect(repo.getSummary).not.toHaveBeenCalled();
    });

    it('fetches from DB and caches on cache miss', async () => {
      redisService.get.mockResolvedValue(null);
      repo.getSummary.mockResolvedValue({
        IN_STOCK: 10,
        LOW_STOCK: 2,
        OUT_OF_STOCK: 1,
      });

      const result = await service.getSummary(COMPANY_ID);

      expect(result.total).toBe(13);
      expect(redisService.set).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // remove
  // ──────────────────────────────────────────────
  describe('remove', () => {
    it('soft-deletes an existing item', async () => {
      const item = ItemFactory.createEntity({ companyId: COMPANY_ID });
      repo.findById.mockResolvedValue(item);
      repo.softDelete.mockResolvedValue(undefined);

      await service.remove(COMPANY_ID, item.id, USER_ID);

      expect(repo.softDelete).toHaveBeenCalledWith(COMPANY_ID, item.id, USER_ID, undefined);
      expect(redisService.del).toHaveBeenCalled();
    });

    it('throws NotFoundException when item does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove(COMPANY_ID, 'ghost', USER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});

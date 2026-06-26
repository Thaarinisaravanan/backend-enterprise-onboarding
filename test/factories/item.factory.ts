import { Item, ItemStatus } from '@prisma/client';
import { CreateItemDto } from '../../src/items/dto/items.dto';

let counter = 0;

function nextCounter() {
  return ++counter;
}

export class ItemFactory {
  /**
   * Returns a valid CreateItemDto with sensible defaults.
   * Any field can be overridden.
   */
  static createDto(overrides: Partial<CreateItemDto> = {}): CreateItemDto {
    const n = nextCounter();
    return {
      title: `Test Item ${n}`,
      description: `Description for test item ${n}`,
      sku: `SKU-TEST-${n.toString().padStart(4, '0')}`,
      quantity: 100,
      category: 'Test Category',
      threshold: 10,
      ...overrides,
    };
  }

  /**
   * Returns a mock Item entity (as would be returned from the DB).
   */
  static createEntity(overrides: Partial<Item> = {}): Item {
    const n = nextCounter();
    const now = new Date();
    return {
      id: `item-id-${n}`,
      title: `Test Item ${n}`,
      description: `Description for test item ${n}`,
      sku: `SKU-${n.toString().padStart(4, '0')}`,
      quantity: 100,
      status: ItemStatus.IN_STOCK,
      category: 'Test Category',
      threshold: 10,
      companyId: 'company-id-test',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...overrides,
    };
  }

  static reset() {
    counter = 0;
  }
}

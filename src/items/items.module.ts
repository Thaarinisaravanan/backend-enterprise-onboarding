import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { PrismaItemsRepository } from './repository/prisma-items.repository';
import { ITEMS_REPOSITORY } from './repository/items.repository.interface';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueueAsync({
      name: 'low-stock-alerts',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
  ],
  controllers: [ItemsController],
  providers: [
    ItemsService,
    {
      provide: ITEMS_REPOSITORY,
      useClass: PrismaItemsRepository,
    },
  ],
  exports: [ItemsService],
})
export class ItemsModule {}

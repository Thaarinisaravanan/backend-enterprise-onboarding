import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LowStockProcessor } from './processors/low-stock.processor';

@Module({
  imports: [
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
  providers: [LowStockProcessor],
})
export class JobsModule {}

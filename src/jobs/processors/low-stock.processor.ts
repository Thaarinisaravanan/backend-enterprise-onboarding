import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

interface LowStockJobData {
  itemId: string;
  companyId: string;
  sku: string;
  title: string;
  quantity: number;
  threshold: number;
  status: string;
}

@Processor('low-stock-alerts')
export class LowStockProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(LowStockProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<LowStockJobData>): Promise<void> {
    const { itemId, companyId, sku, title, quantity, threshold, status } = job.data;
    this.logger.warn(
      { jobId: job.id, itemId, companyId, sku, quantity, threshold, status },
      `[LOW_STOCK_ALERT] "${title}" (SKU: ${sku}) is ${status} — qty: ${quantity}, threshold: ${threshold}`,
    );
  }
}

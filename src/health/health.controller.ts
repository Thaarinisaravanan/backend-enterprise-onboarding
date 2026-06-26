import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Basic liveness check' })
  @ApiResponse({ status: 200 })
  check() {
    return {
      status: 'ok',
      version: this.configService.get<string>('appVersion'),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check — verifies DB and Redis connectivity' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 503, description: 'Service unavailable — dependency not ready' })
  async ready() {
    const [dbHealthy, redisHealthy] = await Promise.all([
      this.prismaService.isHealthy(),
      this.redisService.isHealthy(),
    ]);

    const status = dbHealthy && redisHealthy ? 'ok' : 'degraded';
    const httpStatus = status === 'ok' ? 200 : 503;

    const result = {
      status,
      db: dbHealthy ? 'ok' : 'error',
      redis: redisHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    };

    return { httpStatus, ...result };
  }
}

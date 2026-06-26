import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto, Role } from './dto/auth.dto';
import { ConflictException, NotFoundException, UnauthorizedException } from '../common/exceptions/app.exception';
import { RequestContext } from '../common/middleware/request-context.middleware';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const company = await this.prisma.company.findUnique({ where: { slug: dto.companySlug } });
    if (!company) throw new NotFoundException('Company', dto.companySlug);

    const existing = await this.prisma.user.findUnique({
      where: { email_companyId: { email: dto.email, companyId: company.id } },
    });
    if (existing) throw new ConflictException('User', 'email', dto.email);

    const rounds = this.configService.get<number>('bcrypt.rounds') ?? 12;
    const hashedPassword = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: (dto.role ?? 'VIEWER') as any,
        companyId: company.id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id, companyId: company.id,
        entityType: 'User', entityId: user.id,
        action: 'CREATE' as any,
        after: { email: user.email, role: user.role },
        requestId: RequestContext.getRequestId(),
      },
    });

    this.logger.info({ userId: user.id, companyId: company.id }, 'User registered');
    return this.buildAuthResponse(user, company.id);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const company = await this.prisma.company.findUnique({ where: { slug: dto.companySlug } });
    if (!company) {
      this.logger.warn({ slug: dto.companySlug }, 'Login attempt for unknown company');
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { email_companyId: { email: dto.email, companyId: company.id } },
    });

    if (!user) {
      await this.logAuthEvent(null, company.id, 'LOGIN_FAILURE', { email: dto.email, reason: 'User not found' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      await this.logAuthEvent(user.id, company.id, 'LOGIN_FAILURE', { email: dto.email, reason: 'Wrong password' });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.logAuthEvent(user.id, company.id, 'LOGIN_SUCCESS', { email: dto.email });
    this.logger.info({ userId: user.id, companyId: company.id }, 'Login success');
    return this.buildAuthResponse(user, company.id);
  }

  private buildAuthResponse(
    user: { id: string; email: string; firstName: string; lastName: string; role: string },
    companyId: string,
  ): AuthResponseDto {
    const expiresIn = this.configService.get<string>('jwt.expiration') ?? '15m';
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, companyId, role: user.role },
      { expiresIn },
    );
    return {
      accessToken, tokenType: 'Bearer', expiresIn,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role as Role, companyId },
    };
  }

  private async logAuthEvent(userId: string | null, companyId: string, action: string, metadata: object) {
    await this.prisma.auditLog.create({
      data: { userId, companyId, entityType: 'Auth', action: action as any, metadata, requestId: RequestContext.getRequestId() },
    });
  }
}

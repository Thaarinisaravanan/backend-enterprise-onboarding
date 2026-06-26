import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '../../src/common/exceptions/app.exception';
import { PinoLogger } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockCompany = { id: 'co-001', name: 'Test Co', slug: 'test-co' };
const mockUser = {
  id: 'usr-001',
  email: 'test@example.com',
  password: '$2b$12$hashed',
  firstName: 'Test',
  lastName: 'User',
  role: Role.VIEWER,
  companyId: 'co-001',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const pinoMock = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    prisma = {
      company: { findUnique: jest.fn() },
      user: { findUnique: jest.fn(), create: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as jest.Mocked<PrismaService>;

    jwtService = { sign: jest.fn().mockReturnValue('mock.jwt.token') } as unknown as jest.Mocked<JwtService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(12) } },
        { provide: PinoLogger, useValue: pinoMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates user and returns auth response', async () => {
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');

      const result = await service.register({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        companySlug: 'test-co',
      });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('throws NotFoundException when company slug not found', async () => {
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.register({
          email: 'x@x.com',
          password: 'SecurePass123!',
          firstName: 'A',
          lastName: 'B',
          companySlug: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when email already registered', async () => {
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          companySlug: 'test-co',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns auth response on valid credentials', async () => {
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'SecurePass123!',
        companySlug: 'test-co',
      });

      expect(result.accessToken).toBe('mock.jwt.token');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong', companySlug: 'test-co' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unknown company', async () => {
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'x', companySlug: 'unknown' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { createTestApp, closeTestApp } from './test-app.helper';

/**
 * E2E test: Auth flow
 *
 * Prerequisites: a seeded test DB with company slug 'company-alpha' and no prior test user.
 * Run with: pnpm test:e2e
 */
describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;
  const uniqueEmail = `e2e-${Date.now()}@test.com`;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a new user and returns a JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          firstName: 'E2E',
          lastName: 'Tester',
          companySlug: 'company-alpha',
        })
        .expect(201);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(uniqueEmail);
    });

    it('returns 409 Conflict when email is already registered', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          firstName: 'E2E',
          lastName: 'Tester',
          companySlug: 'company-alpha',
        })
        .expect(409);

      expect(res.body.errorCode).toContain('CONFLICT');
    });

    it('returns 422 when request body is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email' })
        .expect(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns JWT on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          companySlug: 'company-alpha',
        })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.tokenType).toBe('Bearer');
    });

    it('returns 401 on wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: uniqueEmail,
          password: 'WrongPassword!',
          companySlug: 'company-alpha',
        })
        .expect(401);

      expect(res.body.errorCode).toBe('UNAUTHORIZED');
      expect(res.body.requestId).toBeDefined();
    });
  });
});

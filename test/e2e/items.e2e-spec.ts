import { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { createTestApp, closeTestApp } from './test-app.helper';

/**
 * E2E test: Items full happy path
 *
 * register → login → create item → adjust quantity → verify summary → soft delete → confirm excluded
 */
describe('Items (e2e)', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  let createdItemId: string;
  const uniqueEmail = `items-e2e-${Date.now()}@test.com`;

  beforeAll(async () => {
    app = await createTestApp();

    // Register and login as ADMIN
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        password: 'SecurePass123!',
        firstName: 'Item',
        lastName: 'Tester',
        companySlug: 'company-alpha',
        role: 'ADMIN',
      });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: uniqueEmail,
        password: 'SecurePass123!',
        companySlug: 'company-alpha',
      });

    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('POST /api/v1/items', () => {
    it('creates a new item', async () => {
      const sku = `E2E-SKU-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'E2E Test Widget',
          description: 'Created in e2e test',
          sku,
          quantity: 50,
          category: 'E2E',
          threshold: 5,
        })
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.sku).toBe(sku);
      expect(res.body.data.status).toBe('IN_STOCK');
      createdItemId = res.body.data.id;
    });

    it('returns 409 when SKU already exists', async () => {
      const sku = `DUPLICATE-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'First', sku, quantity: 10 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Duplicate', sku, quantity: 10 })
        .expect(409);
    });
  });

  describe('GET /api/v1/items/:id', () => {
    it('returns the created item', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/items/${createdItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(createdItemId);
    });

    it('returns 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/items/:id/adjust', () => {
    it('adjusts quantity downward', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/items/${createdItemId}/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ delta: -45, reason: 'E2E sale' })
        .expect(200);

      expect(res.body.data.quantity).toBe(5);
      expect(res.body.data.status).toBe('LOW_STOCK');
    });
  });

  describe('GET /api/v1/items/summary', () => {
    it('returns inventory summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/items/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(typeof res.body.data.total).toBe('number');
      expect(res.body.data.companyId).toBeDefined();
    });
  });

  describe('DELETE /api/v1/items/:id (soft delete)', () => {
    it('soft-deletes the item', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/items/${createdItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('deleted item no longer appears in list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const ids = res.body.data.map((i: { id: string }) => i.id);
      expect(ids).not.toContain(createdItemId);
    });

    it('deleted item returns 404 by ID', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/items/${createdItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Authorization enforcement', () => {
    it('returns 401 without auth token', async () => {
      await request(app.getHttpServer()).get('/api/v1/items').expect(401);
    });
  });
});

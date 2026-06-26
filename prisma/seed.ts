import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  const hashedPassword = await bcrypt.hash('Password123!', rounds);

  const companyA = await prisma.company.upsert({
    where: { slug: 'company-alpha' },
    update: {},
    create: { name: 'Company Alpha', slug: 'company-alpha' },
  });

  const companyB = await prisma.company.upsert({
    where: { slug: 'company-beta' },
    update: {},
    create: { name: 'Company Beta', slug: 'company-beta' },
  });

  await prisma.user.upsert({
    where: { email_companyId: { email: 'admin@alpha.com', companyId: companyA.id } },
    update: {},
    create: { email: 'admin@alpha.com', password: hashedPassword, firstName: 'Alice', lastName: 'Admin', role: 'ADMIN', companyId: companyA.id },
  });

  await prisma.user.upsert({
    where: { email_companyId: { email: 'manager@alpha.com', companyId: companyA.id } },
    update: {},
    create: { email: 'manager@alpha.com', password: hashedPassword, firstName: 'Mark', lastName: 'Manager', role: 'MANAGER', companyId: companyA.id },
  });

  await prisma.user.upsert({
    where: { email_companyId: { email: 'admin@beta.com', companyId: companyB.id } },
    update: {},
    create: { email: 'admin@beta.com', password: hashedPassword, firstName: 'Bob', lastName: 'Beta', role: 'ADMIN', companyId: companyB.id },
  });

  await prisma.item.createMany({
    skipDuplicates: true,
    data: [
      { title: 'Widget Pro', sku: 'WGT-001', quantity: 150, status: 'IN_STOCK', category: 'Widgets', threshold: 20, companyId: companyA.id },
      { title: 'Gadget Basic', sku: 'GDG-001', quantity: 5, status: 'LOW_STOCK', category: 'Gadgets', threshold: 10, companyId: companyA.id },
    ],
  });

  console.log('✅ Seeding complete');
  console.log(`  Company A: ${companyA.name} (${companyA.id})`);
  console.log(`  Company B: ${companyB.name} (${companyB.id})`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

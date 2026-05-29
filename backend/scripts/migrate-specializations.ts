import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const doctors = await prisma.doctorProfile.findMany({
    select: { id: true, specialization: true },
  });

  for (const doctor of doctors) {
    if (!doctor.specialization) continue;

    const spec = await prisma.specialization.upsert({
      where: { name: doctor.specialization },
      update: {},
      create: { name: doctor.specialization },
    });

    await prisma.doctorSpecialization.upsert({
      where: {
        doctorId_specializationId: {
          doctorId: doctor.id,
          specializationId: spec.id,
        },
      },
      update: {},
      create: {
        doctorId: doctor.id,
        specializationId: spec.id,
        isPrimary: true,
      },
    });
  }

  console.log(`Migrated ${doctors.length} doctor specializations.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

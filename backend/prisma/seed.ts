import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database...');
  
  // Order matters due to foreign keys
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.doctorSpecialization.deleteMany();
  await prisma.recommendationLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database cleared.');

  const passwordHash = await bcrypt.hash('123123123', 10);

  // Seed specializations
  console.log('Seeding specializations...');
  const specializationNames = [
    'General Practice', 'Internal Medicine', 'Pediatrics', 'OB-GYN',
    'Dermatology', 'Cardiology', 'Orthopedics', 'ENT', 'Psychiatry',
    'Neurology', 'Ophthalmology', 'Radiology', 'Surgery',
    'Family Medicine', 'Rehabilitation Medicine',
  ];
  for (const name of specializationNames) {
    await prisma.specialization.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Specializations seeded.');

  // Seeding Doctors
  console.log('Seeding 20 doctors...');
  const specializations = [
    'Cardiology', 'Dermatology', 'Pediatrics', 'Psychiatry', 
    'General Medicine', 'Orthopedics', 'Ophthalmology', 'Neurology',
    'Gastroenterology', 'Endocrinology'
  ];

  for (let i = 1; i <= 20; i++) {
    const email = `doctor${i}@example.com`;
    const fullName = faker.person.fullName();
    const specialization = faker.helpers.arrayElement(specializations);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'DOCTOR',
        doctorProfile: {
          create: {
            fullName,
            professionalTitle: faker.helpers.arrayElement(['Dr.', 'Senior Consultant', 'Associate Professor']),
            specialization,
            bio: faker.lorem.paragraph(),
            yearsOfExperience: faker.number.int({ min: 1, max: 40 }),
            languagesSpoken: faker.helpers.arrayElements(['English', 'Spanish', 'French', 'German', 'Mandarin'], { min: 1, max: 3 }),
            consultationFee: parseFloat(faker.commerce.price({ min: 50, max: 300 })),
            isVerified: true,
            verifiedAt: new Date(),
          },
        },
      },
    });
  }
  console.log('Doctors seeded.');

  // Seeding Patients
  console.log('Seeding 15 patients...');
  for (let i = 1; i <= 15; i++) {
    const email = `patient${i}@example.com`;
    
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'PATIENT',
        patientProfile: {
          create: {
            fullName: faker.person.fullName(),
            birthdate: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
            weight: faker.number.float({ min: 45, max: 120, fractionDigits: 1 }),
            height: faker.number.float({ min: 150, max: 200, fractionDigits: 1 }),
            medicalHistory: faker.helpers.arrayElement([
              'No known allergies.',
              'History of mild asthma.',
              'Type 2 Diabetes controlled by diet.',
              'Hypertension, on medication.',
              'Seasonal allergies.',
            ]),
          },
        },
      },
    });
  }
  console.log('Patients seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

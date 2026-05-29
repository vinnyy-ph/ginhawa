import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

faker.seed(20260529);

// ---- PH constants ----
const FIRST_NAMES_M = ['Juan', 'Jose', 'Antonio', 'Ramon', 'Carlos', 'Miguel', 'Andres', 'Emilio', 'Rafael', 'Gabriel', 'Marco', 'Paolo', 'Enrique', 'Lorenzo', 'Diego'];
const FIRST_NAMES_F = ['Maria', 'Josefa', 'Ana', 'Rosa', 'Carmela', 'Luz', 'Teresa', 'Cristina', 'Isabel', 'Andrea', 'Bianca', 'Camille', 'Patricia', 'Angeline', 'Sofia'];
const SURNAMES = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada', 'Castillo', 'Villanueva', 'Aquino', 'Ramos', 'Del Rosario', 'Dela Cruz', 'Gonzales', 'Flores', 'Rivera', 'Domingo'];

// region -> cities
const PH_LOCATIONS: { region: string; cities: string[] }[] = [
  { region: 'NCR', cities: ['Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig'] },
  { region: 'Region VII (Central Visayas)', cities: ['Cebu City', 'Mandaue'] },
  { region: 'Region XI (Davao Region)', cities: ['Davao City'] },
  { region: 'Region III (Central Luzon)', cities: ['San Fernando', 'Angeles', 'Malolos'] },
  { region: 'Region IV-A (CALABARZON)', cities: ['Calamba', 'Antipolo', 'Bacoor'] },
];

const HMO_PROVIDERS = ['Maxicare', 'Intellicare', 'PhilCare', 'Medicard', 'Insular Health Care', 'Cocolife'];
const LANGUAGES = ['English', 'Filipino', 'Cebuano', 'Ilocano', 'Hiligaynon'];
const TITLES = ['MD', 'MD, FPCP', 'MD, DPPS', 'MD, FPOGS', 'Consultant'];

const SPECIALIZATIONS: { name: string; description: string }[] = [
  { name: 'General Practice', description: 'Primary care for common illnesses and preventive health.' },
  { name: 'Internal Medicine', description: 'Diagnosis and treatment of adult diseases.' },
  { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents.' },
  { name: 'OB-GYN', description: 'Womens reproductive health, pregnancy, and childbirth.' },
  { name: 'Dermatology', description: 'Conditions of the skin, hair, and nails.' },
  { name: 'Cardiology', description: 'Disorders of the heart and blood vessels.' },
  { name: 'Orthopedics', description: 'Musculoskeletal injuries and conditions.' },
  { name: 'ENT', description: 'Ear, nose, and throat disorders.' },
  { name: 'Psychiatry', description: 'Mental health assessment and treatment.' },
  { name: 'Neurology', description: 'Disorders of the brain and nervous system.' },
  { name: 'Ophthalmology', description: 'Eye care and vision disorders.' },
  { name: 'Radiology', description: 'Medical imaging and diagnostics.' },
  { name: 'Surgery', description: 'Operative treatment of disease and injury.' },
  { name: 'Family Medicine', description: 'Comprehensive care for all ages.' },
  { name: 'Rehabilitation Medicine', description: 'Restoring function after injury or illness.' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALLERGIES = ['Penicillin', 'Peanuts', 'Shellfish', 'Pollen', 'Dust mites', 'Aspirin', 'Latex'];
const CONDITIONS = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Hypothyroidism', 'High cholesterol', 'GERD'];
const MEDICATIONS = ['Losartan 50mg', 'Metformin 500mg', 'Salbutamol inhaler', 'Atorvastatin 20mg', 'Levothyroxine 50mcg', 'Omeprazole 20mg'];
const SURGERIES = ['Appendectomy (2015)', 'Cholecystectomy (2018)', 'None', 'Cesarean section (2020)', 'Tonsillectomy (childhood)'];
const FAMILY_HISTORY = ['Diabetes on maternal side', 'Hypertension (father)', 'No significant family history', 'Heart disease (grandfather)', 'Breast cancer (aunt)'];
const SMOKING = ['Never', 'Former', 'Current'];
const MED_HISTORY_SUMMARY = ['No known allergies.', 'History of mild asthma.', 'Type 2 Diabetes controlled by diet.', 'Hypertension, on maintenance medication.', 'Seasonal allergies.', 'Generally healthy, no chronic conditions.'];

const DRUGS: { drugName: string; dosage: string; frequency: string }[] = [
  { drugName: 'Amoxicillin', dosage: '500mg', frequency: 'Every 8 hours' },
  { drugName: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours as needed' },
  { drugName: 'Cetirizine', dosage: '10mg', frequency: 'Once daily' },
  { drugName: 'Losartan', dosage: '50mg', frequency: 'Once daily' },
  { drugName: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
  { drugName: 'Salbutamol', dosage: '2 puffs', frequency: 'As needed' },
];

const REVIEW_COMMENTS = ['Very thorough and patient, explained everything clearly.', 'Highly recommend, made me feel at ease.', 'Professional and on time. Great consultation.', 'Listened well to my concerns.', 'Knowledgeable doctor, helpful advice.', 'Good experience overall.'];
const FOCUS_AREAS = ['Preventive care and lifestyle management', 'Chronic disease management', 'Pediatric wellness and immunization', 'Womens health and family planning', 'Cardiac risk assessment', 'Skin condition diagnosis'];
const CANCEL_REASONS = ['Patient unavailable', 'Doctor emergency', 'Rescheduled by patient request', 'Feeling better, no longer needed'];

// ---- helpers ----
function pickLocation(): { city: string; region: string } {
  const loc = faker.helpers.arrayElement(PH_LOCATIONS);
  return { city: faker.helpers.arrayElement(loc.cities), region: loc.region };
}
function genPhone(): string {
  const n = faker.string.numeric(9);
  return `+63 9${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 9)}`;
}
function genPhilHealth(): string {
  return `${faker.string.numeric(2)}-${faker.string.numeric(9)}-${faker.string.numeric(1)}`;
}
function genPRC(): string {
  return faker.string.numeric(7);
}
function genPTR(): string {
  return faker.string.numeric(8);
}
function genFullName(): string {
  const first = faker.helpers.arrayElement([...FIRST_NAMES_M, ...FIRST_NAMES_F]);
  return `${first} ${faker.helpers.arrayElement(SURNAMES)}`;
}

async function main() {
  console.log('Clearing database...');
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.doctorSpecialization.deleteMany();
  await prisma.recommendationLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.patientMedicalHistory.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.user.deleteMany();
  console.log('Database cleared.');

  const passwordHash = await bcrypt.hash('123123123', 10);

  console.log('Seeding specializations...');
  const specMap = new Map<string, string>();
  for (const s of SPECIALIZATIONS) {
    const rec = await prisma.specialization.upsert({
      where: { name: s.name },
      update: { description: s.description },
      create: { name: s.name, description: s.description },
    });
    specMap.set(s.name, rec.id);
  }
  console.log(`Seeded ${specMap.size} specializations.`);

  console.log('Seeding 30 doctors...');
  const specNames = SPECIALIZATIONS.map((s) => s.name);
  const doctorRecords: { id: string; fee: number }[] = [];

  for (let i = 1; i <= 30; i++) {
    const primary = faker.helpers.arrayElement(specNames);
    const secondary = faker.helpers.maybe(
      () => faker.helpers.arrayElement(specNames.filter((n) => n !== primary)),
      { probability: 0.4 },
    );
    const loc = pickLocation();
    const fee = faker.number.int({ min: 500, max: 3000 });
    const junctions = [
      { specializationId: specMap.get(primary)!, isPrimary: true },
      ...(secondary && specMap.get(secondary)
        ? [{ specializationId: specMap.get(secondary)!, isPrimary: false }]
        : []),
    ];

    const user = await prisma.user.create({
      data: {
        email: `doctor${i}@example.com`,
        passwordHash,
        role: 'DOCTOR',
        doctorProfile: {
          create: {
            fullName: genFullName(),
            professionalTitle: faker.helpers.arrayElement(TITLES),
            bio: faker.lorem.paragraph(),
            specialization: primary,
            profilePictureUrl: faker.image.avatarGitHub(),
            availabilitySummary: 'Mon-Fri, 9:00 AM - 5:00 PM',
            yearsOfExperience: faker.number.int({ min: 1, max: 40 }),
            languagesSpoken: faker.helpers.arrayElements(LANGUAGES, { min: 1, max: 3 }),
            consultationFocusAreas: faker.helpers.arrayElement(FOCUS_AREAS),
            consultationFee: fee,
            prcLicenseNo: genPRC(),
            prcLicenseExpiry: faker.date.future({ years: 3 }),
            ptrNo: genPTR(),
            region: loc.region,
            city: loc.city,
            isVerified: true,
            verifiedAt: new Date(),
            isActive: true,
            specializations: { create: junctions },
          },
        },
      },
      include: { doctorProfile: true },
    });
    doctorRecords.push({ id: user.doctorProfile!.id, fee });
  }
  console.log(`Seeded ${doctorRecords.length} doctors.`);

  console.log('Seeding availability slots...');
  let slotCount = 0;
  for (const doc of doctorRecords) {
    for (let d = 1; d <= 14; d++) {
      const day = new Date();
      day.setDate(day.getDate() + d);
      if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends
      for (let h = 9; h < 15; h++) {
        const start = new Date(day);
        start.setHours(h, 0, 0, 0);
        const end = new Date(start);
        end.setHours(h + 1, 0, 0, 0);
        await prisma.availabilitySlot.create({
          data: { doctorId: doc.id, startTime: start, endTime: end, status: 'AVAILABLE' },
        });
        slotCount++;
      }
    }
  }
  console.log(`Seeded ${slotCount} available slots.`);

  console.log('Seeding 30 patients...');
  const patientIds: string[] = [];

  for (let i = 1; i <= 30; i++) {
    const loc = pickLocation();
    const user = await prisma.user.create({
      data: {
        email: `patient${i}@example.com`,
        passwordHash,
        role: 'PATIENT',
        patientProfile: {
          create: {
            fullName: genFullName(),
            birthdate: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
            weight: faker.number.float({ min: 45, max: 120, fractionDigits: 1 }),
            height: faker.number.float({ min: 150, max: 200, fractionDigits: 1 }),
            profilePictureUrl: faker.image.avatarGitHub(),
            contactDetails: 'Emergency contact: family member',
            phoneNumber: genPhone(),
            address: `${faker.number.int({ min: 1, max: 999 })} ${faker.location.street()}`,
            city: loc.city,
            region: loc.region,
            philhealthId: genPhilHealth(),
            hmoProvider: faker.helpers.arrayElement(HMO_PROVIDERS),
            hmoCardNo: faker.string.alphanumeric(12).toUpperCase(),
            medicalHistory: faker.helpers.arrayElement(MED_HISTORY_SUMMARY),
            medicalHistoryRecord: {
              create: {
                bloodType: faker.helpers.arrayElement(BLOOD_TYPES),
                allergies: faker.helpers.arrayElements(ALLERGIES, { min: 0, max: 3 }),
                chronicConditions: faker.helpers.arrayElements(CONDITIONS, { min: 0, max: 2 }),
                currentMedications: faker.helpers.arrayElements(MEDICATIONS, { min: 0, max: 2 }),
                pastSurgeries: faker.helpers.arrayElement(SURGERIES),
                familyHistory: faker.helpers.arrayElement(FAMILY_HISTORY),
                smokingStatus: faker.helpers.arrayElement(SMOKING),
              },
            },
          },
        },
      },
      include: { patientProfile: true },
    });
    patientIds.push(user.patientProfile!.id);
  }
  console.log(`Seeded ${patientIds.length} patients.`);

  console.log('Seeding appointments + related data...');
  const patientUserMap = new Map<string, string>(
    (await prisma.patientProfile.findMany({ select: { id: true, userId: true } })).map((p) => [p.id, p.userId]),
  );

  const statusBag: ('COMPLETED' | 'CONFIRMED' | 'PENDING' | 'CANCELLED')[] = [
    ...Array(40).fill('COMPLETED'),
    ...Array(25).fill('CONFIRMED'),
    ...Array(20).fill('PENDING'),
    ...Array(15).fill('CANCELLED'),
  ];

  let apptCount = 0;
  let reviewCount = 0;
  for (const patientId of patientIds) {
    const numAppts = faker.number.int({ min: 2, max: 4 });
    for (let a = 0; a < numAppts; a++) {
      const doc = faker.helpers.arrayElement(doctorRecords);
      const status = faker.helpers.arrayElement(statusBag);
      const isPast = status === 'COMPLETED';
      const slotStart = isPast
        ? faker.date.recent({ days: 30 })
        : faker.date.soon({ days: 14 });
      slotStart.setMinutes(0, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotEnd.getHours() + 1);

      const slot = await prisma.availabilitySlot.create({
        data: {
          doctorId: doc.id,
          startTime: slotStart,
          endTime: slotEnd,
          status: status === 'CANCELLED' ? 'AVAILABLE' : 'BOOKED',
        },
      });

      const appt = await prisma.appointment.create({
        data: {
          patientId,
          doctorId: doc.id,
          slotId: slot.id,
          status,
          reasonForVisit: faker.helpers.arrayElement(['Follow-up consultation', 'General check-up', 'Persistent cough', 'Skin rash', 'Routine screening']),
          ...(status === 'CANCELLED'
            ? { cancelledAt: faker.date.recent({ days: 10 }), cancelReason: faker.helpers.arrayElement(CANCEL_REASONS) }
            : {}),
        },
      });
      apptCount++;

      // Payment
      const payStatus = status === 'CANCELLED' ? 'WAIVED' : status === 'PENDING' ? 'PENDING' : status === 'CONFIRMED' ? faker.helpers.arrayElement(['PAID', 'PENDING'] as const) : 'PAID';
      await prisma.payment.create({
        data: { appointmentId: appt.id, amount: doc.fee, currency: 'PHP', status: payStatus },
      });

      // Notification for the patient
      const notifType = status === 'COMPLETED' ? 'APPOINTMENT_COMPLETED' : status === 'CONFIRMED' ? 'APPOINTMENT_CONFIRMED' : status === 'CANCELLED' ? 'APPOINTMENT_CANCELLED' : 'APPOINTMENT_BOOKED';
      await prisma.notification.create({
        data: {
          userId: patientUserMap.get(patientId)!,
          type: notifType,
          title: `Appointment ${status.toLowerCase()}`,
          message: `Your appointment has been ${status.toLowerCase()}.`,
        },
      });

      // Completed -> medical record + prescriptions + maybe review
      if (status === 'COMPLETED') {
        const record = await prisma.medicalRecord.create({
          data: {
            appointmentId: appt.id,
            patientId,
            doctorId: doc.id,
            notes: faker.lorem.sentences(2),
            recommendations: faker.lorem.sentence(),
            followUpAdvice: faker.helpers.arrayElement(['Return in 2 weeks if symptoms persist.', 'No follow-up needed.', 'Schedule lab work before next visit.']),
          },
        });
        const numRx = faker.number.int({ min: 1, max: 3 });
        for (let r = 0; r < numRx; r++) {
          const drug = faker.helpers.arrayElement(DRUGS);
          await prisma.prescription.create({
            data: {
              medicalRecordId: record.id,
              drugName: drug.drugName,
              dosage: drug.dosage,
              frequency: drug.frequency,
              durationDays: faker.number.int({ min: 3, max: 30 }),
              instructions: faker.helpers.arrayElement(['Take after meals.', 'Take with water.', 'Avoid alcohol.']),
            },
          });
        }
        if (faker.datatype.boolean({ probability: 0.7 })) {
          await prisma.review.create({
            data: {
              appointmentId: appt.id,
              patientId,
              doctorId: doc.id,
              rating: faker.number.int({ min: 3, max: 5 }),
              comment: faker.helpers.arrayElement(REVIEW_COMMENTS),
            },
          });
          reviewCount++;
        }
      }
    }
  }
  console.log(`Seeded ${apptCount} appointments, ${reviewCount} reviews.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

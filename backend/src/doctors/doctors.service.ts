/**
 * Business logic for doctor profile management, search/discovery, and
 * aggregated review-rating attachment.
 *
 * Owns the DoctorProfile and DoctorSpecialization records. Review records
 * are read-only from this service — only their aggregate statistics are used.
 */
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

/**
 * Manages doctor profiles throughout their lifecycle: initial creation,
 * upsert-based onboarding, profile updates, public discovery, and
 * attaching live rating aggregates from the reviews table.
 */
@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new doctor profile for the given user.
   * Throws `ConflictException` if a profile already exists for that user.
   */
  async create(userId: string, data: CreateDoctorDto) {
    const existing = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Doctor profile already exists');
    }
    return this.prisma.doctorProfile.create({
      data: { ...data, userId },
    });
  }

  /**
   * Create or update the doctor's profile in a single transaction, then sync
   * the primary specialization join table entry.
   *
   * Preferred over `create` for the onboarding flow because it is idempotent —
   * the same request body can be replayed without generating a conflict.
   *
   * @returns An object with `profileComplete: true` and the saved profile.
   */
  async upsertProfile(
    userId: string,
    dto: import('./dto/create-doctor-profile.dto').CreateDoctorProfileDto,
  ) {
    const profileData = {
      fullName: dto.fullName,
      professionalTitle: dto.professionalTitle,
      specialization: dto.specialization,
      bio: dto.bio,
      yearsOfExperience: dto.yearsOfExperience,
      consultationFee: dto.consultationFee,
      languagesSpoken: dto.languagesSpoken,
      consultationFocusAreas: dto.consultationFocusAreas,
      availabilitySummary: dto.availabilitySummary,
      profilePictureUrl: dto.profilePictureUrl,
      prcLicenseNo: dto.prcLicenseNo,
      prcLicenseExpiry: dto.prcLicenseExpiry
        ? new Date(dto.prcLicenseExpiry)
        : undefined,
      ptrNo: dto.ptrNo,
      region: dto.region,
      city: dto.city,
    };

    const profile = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.doctorProfile.upsert({
        where: { userId },
        update: profileData,
        create: { userId, ...profileData },
      });
      await this.syncPrimarySpecialization(tx, saved.id, dto.specialization);
      return saved;
    });

    return {
      profileComplete: true,
      profile,
    };
  }

  /**
   * Ensure exactly one `DoctorSpecialization` row is marked `isPrimary` for
   * the given doctor, pointing to the specialization with `name`.
   *
   * Runs a delete-then-upsert inside the caller's transaction so the primary
   * marker is always consistent even if the specialization is renamed or a
   * previous primary still exists.
   */
  private async syncPrimarySpecialization(
    tx: Prisma.TransactionClient,
    doctorId: string,
    name: string,
  ) {
    const spec = await tx.specialization.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await tx.doctorSpecialization.deleteMany({
      where: { doctorId, isPrimary: true },
    });
    await tx.doctorSpecialization.upsert({
      where: {
        doctorId_specializationId: { doctorId, specializationId: spec.id },
      },
      update: { isPrimary: true },
      create: { doctorId, specializationId: spec.id, isPrimary: true },
    });
  }

  /** Find a doctor's own profile by their auth user ID. Throws `NotFoundException` if absent. */
  async findByUserId(userId: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    return profile;
  }

  /**
   * Partially update a doctor's profile. If `prcLicenseExpiry` is included,
   * it is parsed from ISO string to a `Date` object (or `null` when explicitly
   * cleared) before persisting. Re-syncs the primary specialization when
   * `specialization` is part of the update.
   */
  async update(userId: string, data: UpdateDoctorDto) {
    const profile = await this.findByUserId(userId);
    const updateData =
      data.prcLicenseExpiry !== undefined
        ? {
            ...data,
            prcLicenseExpiry: data.prcLicenseExpiry
              ? new Date(data.prcLicenseExpiry)
              : null,
          }
        : data;
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.doctorProfile.update({
        where: { id: profile.id },
        data: updateData,
      });
      if (data.specialization) {
        await this.syncPrimarySpecialization(tx, saved.id, data.specialization);
      }
      return saved;
    });
  }

  /**
   * Return all active, verified doctor profiles with their availability slots
   * and specializations, augmented with live rating aggregates. Used by ranking
   * and recommendation engines that need the full profile graph.
   */
  async findRankingCandidates() {
    const profiles = await this.prisma.doctorProfile.findMany({
      where: { isActive: true, isVerified: true },
      include: {
        availabilitySlots: true,
        specializations: { include: { specialization: true } },
      },
    });
    return this.attachRatings(profiles);
  }

  /**
   * Search active, verified doctors with optional name/specialization filters.
   * Results are augmented with live rating aggregates; passing `sortBy='rating'`
   * sorts descending by average rating.
   *
   * @param search - Case-insensitive substring match on `fullName`.
   * @param specialization - Case-insensitive substring match on specialization name.
   * @param sortBy - `'rating'` to sort by descending average rating; otherwise insertion order.
   */
  async searchAll(search?: string, specialization?: string, sortBy?: string) {
    const where: Prisma.DoctorProfileWhereInput = {
      isActive: true,
      isVerified: true,
    };

    if (search) {
      where.fullName = { contains: search, mode: 'insensitive' };
    }

    if (specialization) {
      where.specializations = {
        some: {
          specialization: {
            name: { contains: specialization, mode: 'insensitive' },
          },
        },
      };
    }

    const profiles = await this.prisma.doctorProfile.findMany({
      where,
      include: {
        availabilitySlots: true,
      },
    });

    const withRatings = await this.attachRatings(profiles);

    if (sortBy === 'rating') {
      withRatings.sort((a, b) => b.avgRating - a.avgRating);
    }

    return withRatings;
  }

  /**
   * Batch-fetch visible review aggregates for a list of profiles and merge them
   * in. Uses a single `groupBy` query regardless of list length; defaults to
   * zero for doctors with no visible reviews.
   */
  private async attachRatings<T extends { id: string }>(profiles: T[]) {
    if (profiles.length === 0) {
      return [] as (T & { avgRating: number; reviewCount: number })[];
    }
    const ids = profiles.map((p) => p.id);
    const grouped = await this.prisma.review.groupBy({
      by: ['doctorId'],
      where: { doctorId: { in: ids }, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const byDoctor = new Map(grouped.map((g) => [g.doctorId, g]));
    return profiles.map((p) => {
      const g = byDoctor.get(p.id);
      return {
        ...p,
        avgRating: g?._avg.rating ?? 0,
        reviewCount: g?._count.rating ?? 0,
      };
    });
  }

  /**
   * Fetch a single doctor profile by DoctorProfile ID, including availability
   * slots, specializations, and aggregated rating data.
   * Throws `NotFoundException` if no matching active profile exists.
   */
  async findById(id: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        availabilitySlots: true,
        specializations: { include: { specialization: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    const [withRating] = await this.attachRatings([profile]);
    return withRating;
  }
}

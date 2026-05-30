/**
 * Specializations service — thin read-only wrapper over the Specialization table.
 * Data is seeded at deploy time and treated as stable reference data (no write endpoints).
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

/** Provides read access to the specialization reference list used for doctor profiles and discovery filters. */
@Injectable()
export class SpecializationsService {
  constructor(private prisma: PrismaService) {}

  /** Returns all specializations ordered alphabetically by name. */
  findAll() {
    return this.prisma.specialization.findMany({ orderBy: { name: 'asc' } });
  }
}

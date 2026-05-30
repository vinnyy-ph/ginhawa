import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class SpecializationsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.specialization.findMany({ orderBy: { name: 'asc' } });
  }
}

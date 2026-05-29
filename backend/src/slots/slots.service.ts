import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlotStatus } from '@prisma/client';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import type { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';

@Injectable()
export class SlotsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createSlotDto: CreateSlotDto) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const { startTime, endTime } = createSlotDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException('startTime must be before endTime');
    }

    // Check for overlap
    const overlappingSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        doctorId: doctor.id,
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
    });

    if (overlappingSlot) {
      throw new BadRequestException('Slot overlaps with an existing slot');
    }

    return this.prisma.availabilitySlot.create({
      data: {
        doctorId: doctor.id,
        startTime: start,
        endTime: end,
      },
    });
  }

  async createBulk(userId: string, slots: CreateBulkSlotsDto['slots']) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Parse + drop invalid (start >= end).
    const parsed = slots
      .map((s) => ({ start: new Date(s.startTime), end: new Date(s.endTime) }))
      .filter((s) => s.start < s.end);

    if (parsed.length === 0) {
      return { created: 0, skipped: slots.length };
    }

    const min = new Date(Math.min(...parsed.map((s) => s.start.getTime())));
    const max = new Date(Math.max(...parsed.map((s) => s.end.getTime())));

    const existing = await this.prisma.availabilitySlot.findMany({
      where: {
        doctorId: doctor.id,
        AND: [{ startTime: { lt: max } }, { endTime: { gt: min } }],
      },
      select: { startTime: true, endTime: true },
    });

    const overlaps = (
      aStart: Date,
      aEnd: Date,
      bStart: Date,
      bEnd: Date,
    ) => aStart < bEnd && aEnd > bStart;

    const accepted: { doctorId: string; startTime: Date; endTime: Date }[] = [];

    for (const cand of parsed) {
      const clashesExisting = existing.some((e) =>
        overlaps(cand.start, cand.end, e.startTime, e.endTime),
      );
      const clashesBatch = accepted.some((a) =>
        overlaps(cand.start, cand.end, a.startTime, a.endTime),
      );
      if (clashesExisting || clashesBatch) continue;
      accepted.push({
        doctorId: doctor.id,
        startTime: cand.start,
        endTime: cand.end,
      });
    }

    if (accepted.length > 0) {
      await this.prisma.availabilitySlot.createMany({ data: accepted });
    }

    return { created: accepted.length, skipped: slots.length - accepted.length };
  }

  async findAllByDoctorProfileId(doctorProfileId: string) {
    return this.prisma.availabilitySlot.findMany({
      where: { doctorId: doctorProfileId },
      orderBy: { startTime: 'asc' },
    });
  }

  async update(userId: string, slotId: string, updateSlotDto: UpdateSlotDto) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.doctorId !== doctor.id) {
      throw new ForbiddenException('You can only update your own slots');
    }

    return this.prisma.availabilitySlot.update({
      where: { id: slotId },
      data: updateSlotDto,
    });
  }

  async remove(userId: string, slotId: string) {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.doctorId !== doctor.id) {
      throw new ForbiddenException('You can only delete your own slots');
    }

    if (slot.status === SlotStatus.BOOKED) {
      throw new BadRequestException(
        'Cannot delete a booked slot. Cancel the appointment first.',
      );
    }

    return this.prisma.availabilitySlot.delete({
      where: { id: slotId },
    });
  }
}

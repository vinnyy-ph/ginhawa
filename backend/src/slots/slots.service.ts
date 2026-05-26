import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';

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

    return this.prisma.availabilitySlot.delete({
      where: { id: slotId },
    });
  }
}

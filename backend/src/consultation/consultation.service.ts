import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';

@Injectable()
export class ConsultationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async getOrCreateRoom(
    appointmentId: string,
    userId: string,
  ): Promise<{
    roomUrl: string;
    userName: string;
    patientContext?: {
      fullName: string;
      medicalHistory: string | null;
      weight: number | null;
      height: number | null;
      birthdate: Date;
    };
  }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    const isDoctor = appointment.doctor.userId === userId;
    const isParticipant = appointment.patient.userId === userId || isDoctor;
    if (!isParticipant) throw new ForbiddenException('Access denied');

    const userName = isDoctor
      ? appointment.doctor.fullName
      : appointment.patient.fullName;

    const patientContext = isDoctor
      ? {
          fullName: appointment.patient.fullName,
          medicalHistory: appointment.patient.medicalHistory ?? null,
          weight: appointment.patient.weight ?? null,
          height: appointment.patient.height ?? null,
          birthdate: appointment.patient.birthdate,
        }
      : undefined;

    if (appointment.consultationLink) {
      return {
        roomUrl: appointment.consultationLink,
        userName,
        patientContext,
      };
    }

    // Create a real Daily.co room via REST API
    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      throw new Error('DAILY_API_KEY is not configured on the server.');
    }

    const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24h from now
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `ginhawa-${appointmentId}`,
        properties: { exp },
      }),
    });

    if (!response.ok) {
      const err: unknown = await response.json().catch(() => ({}));
      throw new Error(
        `Daily.co room creation failed: ${(err as { error?: string }).error ?? response.statusText}`,
      );
    }

    const room = (await response.json()) as { url: string };
    const roomUrl = room.url;

    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { consultationLink: roomUrl },
    });

    return { roomUrl, userName, patientContext };
  }

  async updateNotes(
    appointmentId: string,
    userId: string,
    notes: string,
  ): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: { include: { user: true } } },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.doctor.userId !== userId)
      throw new ForbiddenException('Only the doctor can update notes');

    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { liveNotes: notes },
    });
  }

  async summarize(appointmentId: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: true,
      },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.doctor.userId !== userId)
      throw new ForbiddenException('Only the doctor can summarize');

    const notes = appointment.liveNotes ?? '';
    const prompt = `You are a clinical assistant. Analyze these doctor's notes from a telemedicine consultation and return ONLY a valid JSON object (no markdown, no code blocks) with these exact keys:
{
  "doctorSummary": "clinical summary for the doctor with diagnosis and medical terminology",
  "patientSummary": "simple, empathetic summary for the patient in plain language",
  "prescriptions": "list of prescriptions if mentioned, or empty string",
  "followUp": "follow-up recommendations"
}
Notes: ${notes}`;

    return this.gemini.generateJson(prompt);
  }
}

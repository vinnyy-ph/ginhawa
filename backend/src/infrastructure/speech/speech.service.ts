import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq, { toFile } from 'groq-sdk';

/**
 * Audio transcription via Groq's hosted Whisper model.
 *
 * The 'dummy' API-key fallback keeps the module loadable in local/test
 * environments where GROQ_API_KEY is unset; real calls require a valid key.
 */
@Injectable()
export class SpeechService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

  /**
   * Transcribes an in-memory audio buffer to text.
   * @throws InternalServerErrorException if the provider call fails.
   */
  async transcribeAudio(file: Express.Multer.File): Promise<{ text: string }> {
    try {
      // Groq SDK expects a global File or a stream. We can construct it from the buffer using toFile.
      const audioFile = await toFile(
        file.buffer,
        file.originalname || 'audio.webm',
      );

      const transcription = await this.groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
      });

      return { text: transcription.text };
    } catch {
      throw new InternalServerErrorException('Speech transcription failed');
    }
  }
}

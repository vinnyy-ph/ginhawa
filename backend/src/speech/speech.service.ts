import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class SpeechService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

  async transcribeAudio(file: Express.Multer.File): Promise<{ text: string }> {
    try {
      // Groq SDK expects a global File or a stream. We can construct a File from the buffer.
      const audioFile = new File([file.buffer], file.originalname || 'audio.webm', {
        type: file.mimetype || 'audio/webm',
      });

      const transcription = await this.groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
      });

      return { text: transcription.text };
    } catch (error) {
      throw new InternalServerErrorException('Speech transcription failed');
    }
  }
}

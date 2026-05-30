/**
 * Speech-to-text endpoint backing the voice-input feature (e.g. dictating
 * symptoms on the recommendations page).
 *
 * `@OptionalJwt()` because voice input is available to guests as well as
 * signed-in users. The uploaded audio is held in memory (multer default) and
 * forwarded straight to the transcription provider.
 */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';
import { OptionalJwt } from '../../auth/decorators/optional-jwt.decorator';

@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  /** Transcribes an uploaded `audio` file to text. */
  @Post('transcribe')
  @OptionalJwt()
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }
    return this.speechService.transcribeAudio(file);
  }
}

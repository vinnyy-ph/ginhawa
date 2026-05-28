import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';
import { OptionalJwt } from '../auth/decorators/optional-jwt.decorator';

@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

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

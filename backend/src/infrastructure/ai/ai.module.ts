/**
 * AI infrastructure module.
 *
 * Wraps the Google Gemini client behind GeminiService and exports it so
 * feature modules (e.g. recommendations) can request structured AI output
 * without depending on the SDK directly.
 */
import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Module({
  providers: [GeminiService],
  exports: [GeminiService],
})
export class AiModule {}

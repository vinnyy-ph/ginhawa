import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { RecommendationsService } from './recommendations.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalJwt } from '../auth/decorators/optional-jwt.decorator';

/**
 * Recommendation endpoints. The two POST routes are `@OptionalJwt()` so guests
 * can use them; a token, when present, enables personalization and history.
 */
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * `POST /recommendations` — legacy symptom triage. Streams the AI result as
   * chunked plain text so the client can render it progressively. Writes a
   * trailing `{ error }` chunk if the stream fails mid-flight.
   */
  @Post()
  @OptionalJwt()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req: { user?: { id?: string } },
    @Body() createRecommendationDto: CreateRecommendationDto,
    @Res() res: Response,
  ) {
    const userId = req.user?.id ?? null;
    const stream = await this.recommendationsService.createStream(
      userId,
      createRecommendationDto,
    );

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      for await (const chunk of stream) {
        res.write(chunk);
      }
    } catch (e) {
      console.error(e);
      // Headers may already be flushed once streaming has begun, so only set
      // the status code if nothing has been written yet.
      if (!res.headersSent) {
        res.status(500);
      }
      res.write(JSON.stringify({ error: 'Stream failed' }));
    } finally {
      res.end();
    }
  }

  /**
   * `POST /recommendations/match` — context-aware matching. Returns the AI
   * explanation plus a ranked list of matching doctors in a single JSON body.
   */
  @Post('match')
  @OptionalJwt()
  @UseGuards(JwtAuthGuard)
  async match(
    @Request() req: { user?: { id?: string } },
    @Body() createRecommendationDto: CreateRecommendationDto,
  ) {
    const userId = req.user?.id ?? null;
    return this.recommendationsService.match(userId, createRecommendationDto);
  }

  /** `GET /recommendations` — the signed-in patient's recommendation history. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  findAll(@Request() req: { user: { id: string } }) {
    return this.recommendationsService.findAllForPatient(req.user.id);
  }
}

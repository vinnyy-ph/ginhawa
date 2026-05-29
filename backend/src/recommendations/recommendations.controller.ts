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

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

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
      if (!res.headersSent) {
        res.status(500);
      }
      res.write(JSON.stringify({ error: 'Stream failed' }));
    } finally {
      res.end();
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  findAll(@Request() req: { user: { id: string } }) {
    return this.recommendationsService.findAllForPatient(req.user.id);
  }
}

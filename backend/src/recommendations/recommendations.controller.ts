import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post()
  @Public()
  @UseGuards(JwtAuthGuard)
  create(
    @Request() req: { user?: { id?: string } },
    @Body() createRecommendationDto: CreateRecommendationDto,
  ) {
    const userId = req.user?.id ?? null;
    return this.recommendationsService.create(userId, createRecommendationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  findAll(@Request() req: { user: { id: string } }) {
    return this.recommendationsService.findAllForPatient(req.user.id);
  }
}

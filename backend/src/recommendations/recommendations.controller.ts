import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post()
  @Roles('PATIENT')
  create(
    @Request() req: { user: { id: string } },
    @Body() createRecommendationDto: CreateRecommendationDto,
  ) {
    return this.recommendationsService.create(req.user.id, createRecommendationDto);
  }

  @Get()
  @Roles('PATIENT')
  findAll(@Request() req: { user: { id: string } }) {
    return this.recommendationsService.findAllForPatient(req.user.id);
  }
}

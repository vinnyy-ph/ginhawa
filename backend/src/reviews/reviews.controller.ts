/**
 * Handles doctor reviews submitted by patients after completed consultations.
 * Review creation requires JWT authentication and the PATIENT role.
 * The public listing endpoint is unauthenticated so that doctor profiles can
 * display ratings to anonymous visitors.
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Controller for the `/reviews` route group.
 * Write operations are JWT-guarded (PATIENT only); the doctor listing is public.
 */
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /reviews
   * Submits a star rating and optional comment for a completed appointment.
   * Restricted to the PATIENT role; only the appointment's own patient may review.
   */
  @Post()
  @Roles('PATIENT')
  create(
    @Request() req: { user: { id: string } },
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  /**
   * GET /reviews/doctor/:doctorId
   * Returns all visible (non-moderated) reviews for a doctor, newest-first.
   * Public endpoint — no authentication required.
   */
  @Public()
  @Get('doctor/:doctorId')
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.reviewsService.findByDoctor(doctorId);
  }
}

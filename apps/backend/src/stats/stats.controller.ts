import { Request, Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { StatsAnalyticsQueryDto } from './dto/stats-analytics-query.dto';
import { StatsAnalyticsResponseDto } from './dto/stats-analytics-response.dto';
import { StatsService } from './stats.service';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('analytics')
  @ApiOperation({
    summary: 'Get current user daily analytics',
    description:
      'Returns daily aggregated analytics for messages, conversations and tokens. Without dates, returns the full series for the current UTC year up to today.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily analytics retrieved successfully',
    type: StatsAnalyticsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMyAnalytics(
    @Request() req: any,
    @Query() query: StatsAnalyticsQueryDto,
  ): Promise<StatsAnalyticsResponseDto> {
    return this.statsService.getUserAnalytics(req.user.id, query);
  }
}

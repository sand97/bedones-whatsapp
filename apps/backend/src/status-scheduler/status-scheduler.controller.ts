import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { CreateStatusScheduleDto } from './dto/create-status-schedule.dto';
import { StatusScheduleQueryDto } from './dto/status-schedule-query.dto';
import { UpdateStatusScheduleDto } from './dto/update-status-schedule.dto';
import { StatusSchedulerService } from './status-scheduler.service';

@ApiTags('status-scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/status-schedules')
export class StatusSchedulerController {
  constructor(
    private readonly statusSchedulerService: StatusSchedulerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List scheduled WhatsApp statuses for current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled statuses retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listSchedules(
    @Request() req: any,
    @Query() query: StatusScheduleQueryDto,
  ) {
    return this.statusSchedulerService.listForUser(req.user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new scheduled WhatsApp status' })
  @ApiResponse({
    status: 201,
    description: 'Scheduled status created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createSchedule(
    @Request() req: any,
    @Body() dto: CreateStatusScheduleDto,
  ) {
    return this.statusSchedulerService.createForUser(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scheduled WhatsApp status' })
  @ApiParam({ name: 'id', description: 'Scheduled status ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Scheduled status not found' })
  async updateSchedule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStatusScheduleDto,
  ) {
    return this.statusSchedulerService.updateForUser(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a scheduled WhatsApp status' })
  @ApiParam({ name: 'id', description: 'Scheduled status ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled status cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Scheduled status not found' })
  async cancelSchedule(@Request() req: any, @Param('id') id: string) {
    return this.statusSchedulerService.cancelForUser(req.user.id, id);
  }
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class StatusScheduleQueryDto {
  @ApiPropertyOptional({
    description: 'Start day (inclusive) in ISO format YYYY-MM-DD',
    example: '2026-03-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must use YYYY-MM-DD format',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End day (inclusive) in ISO format YYYY-MM-DD',
    example: '2026-03-31',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must use YYYY-MM-DD format',
  })
  endDate?: string;
}

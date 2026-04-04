import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export enum DashboardTrendGranularity {
  week = 'week',
  month = 'month',
}

export class DashboardOverviewQueryDto {
  @ApiPropertyOptional({
    example: '2026-04',
    description: 'Calendar month filter in YYYY-MM format (cannot be combined with startDate/endDate)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @ApiPropertyOptional({
    example: '2026-04-01',
    description: 'Custom range start date (requires endDate)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-04-30',
    description: 'Custom range end date (requires startDate)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: DashboardTrendGranularity,
    example: DashboardTrendGranularity.week,
    description: 'Trend aggregation bucket size',
  })
  @IsOptional()
  @IsEnum(DashboardTrendGranularity)
  granularity?: DashboardTrendGranularity;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 20,
    description: 'Maximum number of category totals returned',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  categoryLimit?: number;

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 10,
    description: 'Number of recent activity entries included in overview',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  activityLimit?: number;
}

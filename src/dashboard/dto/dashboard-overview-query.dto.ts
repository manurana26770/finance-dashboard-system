import { Type } from 'class-transformer';
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
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(DashboardTrendGranularity)
  granularity?: DashboardTrendGranularity;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  categoryLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  activityLimit?: number;
}

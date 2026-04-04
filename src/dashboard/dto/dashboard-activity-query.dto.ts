import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class DashboardActivityQueryDto {
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

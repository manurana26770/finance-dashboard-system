import { IsString, MaxLength } from 'class-validator';

export class UpdateUserStatusDto {
  @IsString()
  @MaxLength(30)
  status!: string;
}
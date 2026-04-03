import { IsEmail, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsInt()
  @Min(1)
  roleId!: number;
}
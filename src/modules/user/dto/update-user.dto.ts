import { IsEmail, IsNumber, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  readonly nickname: string;

  @IsString()
  @IsEmail()
  @MaxLength(60)
  readonly email: string;

  @IsString()
  @Matches(/^[A-Za-z\d!@#$%^&*()]{4,16}$/)
  readonly password: string;

  @IsString()
  readonly phone: string;

  @IsNumber()
  readonly grade: number;
}

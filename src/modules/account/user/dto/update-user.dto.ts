import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * 유저 정보 수정 시 필요한 dto
 */
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
  @Type(() => Number)
  readonly grade: number;
}

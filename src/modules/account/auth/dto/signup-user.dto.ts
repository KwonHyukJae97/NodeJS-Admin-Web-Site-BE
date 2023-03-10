import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * 사용자 회원가입을 위한 dto 정의
 */
export class SignUpUserDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  @MinLength(5)
  readonly id: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(16)
  readonly password: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  readonly name: string;

  @IsNotEmpty()
  @IsEmail()
  @Matches(/^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i, {
    message: '이메일 양식에 맞게 입력해주세요.',
  })
  readonly email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  readonly phone: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  readonly nickname: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  readonly birth: string;

  @IsNotEmpty()
  readonly gender: string;

  @IsNotEmpty()
  readonly grade: number;
}

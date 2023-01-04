import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

/**
 * 단어 수정 시 필요한 예문 Dto 정의
 */
export class UpdateExampleDto {
  @IsNotEmpty()
  @IsNumber()
  exampleId: number;

  @IsNotEmpty()
  @IsString()
  sentence: string;

  @IsNotEmpty()
  @IsString()
  translation: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  source: string;

  @IsNotEmpty()
  @IsNumber()
  exampleSequence: number;
}

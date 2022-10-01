import { IsNotEmpty } from 'class-validator';

/**
 * 공지사항 등록 시, 필요한 필드로 구성한 dto
 */

export class CreateNoticeDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  isTop: boolean;

  @IsNotEmpty()
  noticeGrant: string;

  @IsNotEmpty()
  boardType: string;
}

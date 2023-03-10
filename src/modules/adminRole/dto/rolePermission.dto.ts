import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

/**
 * 역할 수정 dto
 */
export class rolePermissionDto {
  @IsString()
  readonly grantType: string;
  @IsNotEmpty()
  @IsNumber()
  readonly permissionId: number;
}

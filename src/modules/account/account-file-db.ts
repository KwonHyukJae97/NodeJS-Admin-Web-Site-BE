import { FileDbInterface } from '../file/file-db.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { Account } from './entities/account.entity';
import { AccountFile } from '../file/entities/account-file.entity';
import { ConvertException } from '../../common/utils/convert-exception';

/**
 * 계정 관련 파일 DB 저장/수정/삭제용 인터페이스 구현체
 */
@Injectable()
export class AccountFileDb implements FileDbInterface {
  constructor(
    @InjectRepository(Account) private accountRepository: Repository<Account>,
    @InjectRepository(AccountFile) private fileRepository: Repository<AccountFile>,
    @Inject(ConvertException) private convertException: ConvertException,
  ) {}

  /**
   * 파일 정보 저장 메소드
   * @param id : account_id
   * @param fileInfo : 파일 정보
   * @returns : DB처리 실패 시 에러 메시지 반환 / 저장 성공 시 void 반환
   */
  async save(id: number, fileInfo: any, queryRunner: QueryRunner) {
    const { originalFileName, fileName, fileExt, filePath, fileSize } = fileInfo;

    try {
      const accountFile = queryRunner.manager.getRepository(AccountFile).create({
        accountId: id,
        originalFileName,
        fileName,
        fileExt,
        filePath,
        fileSize,
      });

      await queryRunner.manager.getRepository(AccountFile).save(accountFile);
    } catch (err) {
      console.log('DB 파일 저장 실패');
      return this.convertException.badRequestError('계정 파일 정보에', 400);
    }
  }

  /**
   * 파일 정보 삭제 메소드
   * @param id : account_id
   * @returns : DB처리 실패 시 에러 메시지 반환 / 삭제 성공 시 void 반환
   */
  async delete(id: number, fieldName: null, queryRunner: QueryRunner) {
    // 기존 파일 조회
    const file = await this.fileRepository.findOneBy({ accountId: id });

    const deleteList = [];

    // S3 key값으로 사용될 속성 추출
    if (file) {
      deleteList.push(file.fileName);

      try {
        await this.fileRepository.softDelete({ accountFileId: file.accountFileId });
      } catch (err) {
        console.log('DB 파일 삭제 실패', err);
        return this.convertException.CommonError(500);
      }
      // S3 key값 반환
      return deleteList;
    }
  }
}

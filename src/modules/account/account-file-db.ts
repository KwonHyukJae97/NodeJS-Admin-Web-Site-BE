import { FileDbInterface } from '../file/file-db.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Account } from './entities/account';
import { AccountFile } from '../file/entities/account-file';

/**
 * 계정 파일 관련 DB 저장/수정/삭제 시, 사용되는 인터페이스 구현체
 */

@Injectable()
export class AccountFileDb implements FileDbInterface {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(AccountFile)
    private fileRepository: Repository<AccountFile>,
  ) {}

  // DB 파일 정보 저장하는 메서드
  async save(id: number, fileInfo: any) {
    const { originalFileName, fileName, fileExt, filePath, fileSize } = fileInfo;

    const accountFile = this.fileRepository.create({
      accountId: id,
      originalFileName,
      fileName,
      fileExt,
      filePath,
      fileSize,
    });

    try {
      await this.fileRepository.save(accountFile);
    } catch (err) {
      console.log('DB 파일 저장 실패');
      throw new BadRequestException('파일 저장에 실패하였습니다.');
    }
  }

  // DB 파일 정보 삭제하는 메서드
  async delete(id: number) {
    // 기존 파일 조회
    const file = await this.fileRepository.findOneBy({ accountId: id });

    // S3 key값으로 사용될 속성 추출
    if (file) {
      const deleteFile = file.fileName;

      try {
        await this.fileRepository.softDelete({ accountFileId: file.accountFileId });
      } catch (err) {
        console.log('DB 파일 삭제 실패', err);
        throw new BadRequestException('파일 삭제에 실패하였습니다.');
      }
      // S3 key값 반환
      return deleteFile;
    }
  }

  // 회원가입 시, DB 기본 이미지 파일 정보 저장하는 메서드
  async initSave(id: number) {
    const accountFile = this.fileRepository.create({
      accountId: id,
      originalFileName: '기본 이미지',
      fileName: 'account/basic-profile.png',
      fileExt: '.png',
      filePath: 'https://b2c-file-test.s3.ap-northeast-2.amazonaws.com/account/basic-profile.png',
      fileSize: 14500,
    });

    try {
      await this.fileRepository.save(accountFile);
    } catch (err) {
      console.log('DB 파일 저장 실패');
      throw new BadRequestException('파일 저장에 실패하였습니다.');
    }
  }
}

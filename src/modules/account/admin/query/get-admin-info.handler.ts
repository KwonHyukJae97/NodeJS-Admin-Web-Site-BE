import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { GetAdminInfoQuery } from './get-admin-info.query';
import { ConvertException } from 'src/common/utils/convert-exception';
import { AccountFile } from '../../../file/entities/account-file.entity';

/**
 * 관리자 상세 정보 조회용 쿼리 핸들러
 */
@QueryHandler(GetAdminInfoQuery)
export class GetAdminInfoQueryHandler implements IQueryHandler<GetAdminInfoQuery> {
  constructor(
    @InjectRepository(Admin) private adminRepository: Repository<Admin>,
    @Inject(ConvertException) private convertException: ConvertException,
    @InjectRepository(AccountFile) private fileRepository: Repository<AccountFile>,
  ) {}

  /**
   * 관리자 상세 정보 조회 메소드
   * @param query : 관리자 정보 조회 쿼리
   * @returns : DB처리 실패 시 에러 메시지 반환 / 조회 성공 시 관리자 정보 반환
   */
  async execute(query: GetAdminInfoQuery) {
    const { adminId } = query;

    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.account', 'account')
      .where('admin.admin_id = :adminId', { adminId: adminId })
      // .where('account.account_id =:accountId', { accountId: adminId })
      .getOne();

    if (!admin) {
      return this.convertException.notFoundError('관리자', 404);
    }

    console.log('관리자', admin);

    const accountFile = await this.fileRepository.findOneBy({
      accountId: admin.accountId,
    });

    // 저장된 파일이 있다면, 파일 정보와 함께 반환
    if (accountFile) {
      const adminInfo = {
        user: admin,
        file: accountFile,
      };
      return adminInfo;
    }

    //관리자 상세 정보 반환
    return admin;
  }
}

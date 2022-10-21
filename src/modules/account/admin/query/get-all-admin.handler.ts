import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin';
import { GetAllAdminQuery } from './get-all-admin.query';
import { AccountFile } from '../../../file/entities/account-file';

/**
 * 관리자 전체 조회용 쿼리 핸들러
 */
@QueryHandler(GetAllAdminQuery)
export class GetAllAdminQueryHandler implements IQueryHandler<GetAllAdminQuery> {
  constructor(
    @InjectRepository(Admin) private adminRepository: Repository<Admin>,
    @InjectRepository(AccountFile) private fileRepository: Repository<AccountFile>,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(query: GetAllAdminQuery) {
    const admin = await this.adminRepository.find({});
    if (!admin) {
      throw new NotFoundException('Admin does not exist');
    }
    // 관리자 전체 리스트 반환
    // console.log('adminList', admin);
    // return admin;

    let adminInfo;

    // 조회한 각 사용자 정보마다 반복문 돌려가면서 필요에 맞는 정보 반환
    const adminInfoList = await Promise.all(
      admin.map(async (admin) => {
        const accountId = admin.accountId;

        // '탈퇴'한 회원이면 'user' 정보만 반환
        if (accountId === null) {
          adminInfo = {
            admin: admin,
          };

          // 현재 회원이면, 저장된 파일이 있는지 확인
        } else {
          const accountFile = await this.fileRepository.findOneBy({
            accountId: accountId.accountId,
          });

          // 파일이 있으면 'user'와 'file = accountFile' 정보 반환
          if (accountFile) {
            adminInfo = {
              admin: admin,
              file: accountFile,
            };

            // 파일이 없으면 'user'와 'file = null' 정보 반환
          } else {
            adminInfo = {
              admin: admin,
              file: null,
            };
          }
        }
        return adminInfo;
      }),
    );

    return adminInfoList;
  }
}

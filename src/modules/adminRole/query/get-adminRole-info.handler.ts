import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminRole } from '../entities/adminrole.entity';
import { GetAdminRoleInfoQuery } from './get-adminRole-info.query';

/**
 * 역할 상세 정보 조회용 쿼리 핸들러
 */
@QueryHandler(GetAdminRoleInfoQuery)
export class GetAdminRoleInfoQueryHandler implements IQueryHandler<GetAdminRoleInfoQuery> {
  constructor(@InjectRepository(AdminRole) private adminroleRepository: Repository<AdminRole>) {}

  async execute(query: GetAdminRoleInfoQuery) {
    const { roleId } = query;

    const adminrole = await this.adminroleRepository.findOneBy({ roleId: roleId });

    if (!adminrole) {
      throw new NotFoundException('AdminRole does not exist');
    }
    //권한 상세 정보
    return adminrole;
  }
}

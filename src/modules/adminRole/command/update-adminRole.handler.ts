import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateAdminRoleCommand } from './update-adminRole.command';
import { AdminRole } from '../entities/adminRole.entity';
import { Repository, DataSource } from 'typeorm';
import { ConvertException } from 'src/common/utils/convert-exception';
import { RolePermission } from '../entities/rolePermission.entity';
import { rolePermissionDto } from '../dto/rolePermission.dto';

/**
 * 역할 정보 수정용 커맨드 핸들러
 */
@Injectable()
@CommandHandler(UpdateAdminRoleCommand)
export class UpdateAdminRoleHandler implements ICommandHandler<UpdateAdminRoleCommand> {
  constructor(
    @InjectRepository(AdminRole) private adminroleRepository: Repository<AdminRole>,
    @InjectRepository(RolePermission) private rolePermissionRepository: Repository<RolePermission>,
    @Inject(ConvertException) private convertException: ConvertException,
    private dataSource: DataSource,
  ) {}

  /**
   * 역할 정보 수정 메소드
   * @param command : 역할 정보 수정에 필요한 파라미터
   * @returns : DB처리 실패 시 에러 메시지 반환 / 수정 성공 시 수정된 정보 반환
   */
  async execute(command: UpdateAdminRoleCommand) {
    const { roleName, roleDto, roleId, updateBy } = command;

    // 역할 정보 조회
    const adminrole = await this.adminroleRepository.findOneBy({ roleId: roleId });
    if (!adminrole) {
      return this.convertException.notFoundError('역할', 404);
    }

    adminrole.roleName = roleName;
    adminrole.updateBy = updateBy;

    // 역할_권한정보에 등록된 roleId 조회
    const findRoleId = await this.rolePermissionRepository.findBy({ roleId: roleId });
    if (!findRoleId) {
      return this.convertException.notFoundError('역할_권한정보에 ', 404);
    }

    // 역할_권한 정보 (permissionId, grantType) 조회
    const findRolePermissionList = await this.rolePermissionRepository
      .createQueryBuilder('rolePermission')
      .select(
        `rolePermission.permission_id AS permissionId, rolePermission.grant_type AS grantType`,
      )
      .where('rolePermission.roleId=:roleId', { roleId: roleId })
      .getRawMany();

    const tempDeleteRoleDtoList = [];
    const tempInsertRoleDtoList = [];
    const tempUpdateRoleDtoList = [];

    roleDto.forEach((role: RolePermission) => {
      const isExistData =
        findRolePermissionList.filter((rolePermission: rolePermissionDto) => {
          return (
            rolePermission.permissionId == role.permissionId &&
            rolePermission.grantType == role.grantType
          );
        }).length > 0;
      if (!isExistData) {
        tempInsertRoleDtoList.push(role);
      }
    });

    findRolePermissionList.forEach(async (value: RolePermission) => {
      const filterList = roleDto.filter((role: rolePermissionDto) => {
        return value.permissionId == role.permissionId && value.grantType == role.grantType;
      });

      const isExistData = filterList.length > 0;

      if (isExistData) {
        tempUpdateRoleDtoList.push(value);
      } else {
        tempDeleteRoleDtoList.push(value);
      }
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 역할 정보(역할이름) DB저장
      await queryRunner.manager.getRepository(AdminRole).save(adminrole);

      // 기존 데이터와 수정할 데이터를 비교하여 수정된 데이터가 있으면 해당 데이터는 update 날짜만 수정
      tempUpdateRoleDtoList.forEach(async (role) => {
        await queryRunner.manager.getRepository(RolePermission).update(
          {
            permissionId: role.permissionId,
          },
          {},
        );
      });

      // 기존 데이터와 수정할 데이터를 비교하여 신규 데이터가 있으면 insert처리
      tempInsertRoleDtoList.forEach(async (role) => {
        const createRole = await queryRunner.manager.getRepository(RolePermission).create({
          roleId,
          permissionId: role.permissionId,
          grantType: role.grantType,
        });

        await queryRunner.manager.getRepository(RolePermission).insert(createRole);
      });

      // 기존 데이터와 수정할 데이터를 비교하여 삭제할 데이터가 있으면 해당 데이터는 delete 처리
      tempDeleteRoleDtoList.forEach(async (role) => {
        await queryRunner.manager.getRepository(RolePermission).delete({
          grantType: role.grantType,
          permissionId: role.permissionId,
          roleId: roleId,
        });
      });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      return this.convertException.CommonError(500);
    } finally {
      await queryRunner.release();
    }

    return '수정이 완료 되었습니다.';
  }
}

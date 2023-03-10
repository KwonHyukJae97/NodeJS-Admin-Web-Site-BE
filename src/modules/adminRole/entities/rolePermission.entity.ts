import { Admin } from 'src/modules/account/admin/entities/admin.entity';
import { Account } from 'src/modules/account/entities/account.entity';
import { Permission } from 'src/modules/permission/entities/permission.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 역할_권한 정보 에 대한 엔티티 정의
 */
@Entity('role_permission')
export class RolePermission extends BaseEntity {
  //역할 번호
  @PrimaryColumn({
    primary: false,
    name: 'role_id',
    type: 'int',
  })
  roleId: number;

  //권한 번호
  @Column({
    name: 'permission_id',
    type: 'int',
  })
  permissionId: number;

  //권한 종류
  @Column({
    name: 'grant_type',
    type: 'char',
  })
  grantType: string;

  //변경 일시
  @UpdateDateColumn({
    name: 'update_date',
    type: 'datetime',
    nullable: true,
  })
  updateDate: Date;

  //삭제 일시
  @DeleteDateColumn({
    name: 'del_date',
    type: 'datetime',
    nullable: true,
  })
  deleteDate: Date;

  //등록 일시
  @CreateDateColumn({
    name: 'reg_date',
    type: 'datetime',
  })
  regDate: Date;

  //권한 정보 가져오기
  @OneToOne(() => Permission)
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  //관리자 정보 가져오기
  @OneToOne(() => Admin)
  @JoinColumn({ name: 'role_id' })
  admin: Admin;
}

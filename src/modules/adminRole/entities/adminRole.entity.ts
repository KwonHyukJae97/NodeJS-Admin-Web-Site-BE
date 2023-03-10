import { Admin } from 'src/modules/account/admin/entities/admin.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 역할에 대한 엔티티 정의
 */
@Entity('admin_role')
export class AdminRole extends BaseEntity {
  //역할 번호
  @PrimaryGeneratedColumn({
    name: 'role_id',
    type: 'int',
  })
  roleId: number;

  //회원사 번호
  @Column({
    name: 'company_id',
    type: 'int',
  })
  companyId: number;

  //역할 이름
  @Column({
    name: 'role_name',
    type: 'varchar',
    length: '50',
  })
  roleName: string;

  //등록자 이름
  @Column({
    name: 'reg_by',
    type: 'varchar',
    length: '20',
  })
  regBy: string;

  //수정자 이름
  @Column({
    name: 'update_by',
    type: 'varchar',
    length: '20',
  })
  updateBy: string;

  //등록 일시
  @CreateDateColumn({
    name: 'reg_date',
    type: 'datetime',
  })
  regDate: Date;

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

  //관리자 정보 가져오기
  @OneToMany(() => Admin, (admin) => admin.adminRole)
  @JoinColumn({ name: 'role_id' })
  admin: Admin[];
}

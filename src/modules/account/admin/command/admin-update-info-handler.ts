import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConvertException } from 'src/common/utils/convert-exception';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin';
import { Account } from '../../entities/account';
import { AdminUpdateInfoCommand } from './admin-update-info.command';
import { FileUpdateEvent } from '../../../file/event/file-update-event';
import { FileType } from '../../../file/entities/file-type.enum';
import { FileCreateEvent } from '../../../file/event/file-create-event';
import { AccountFile } from '../../../file/entities/account-file';
import { AccountFileDb } from '../../account-file-db';

/**
 * 관리자 상세 정보 수정용 커맨드 핸들러
 */
@Injectable()
@CommandHandler(AdminUpdateInfoCommand)
export class AdminUpdateInfoHandler implements ICommandHandler<AdminUpdateInfoCommand> {
  constructor(
    @InjectRepository(Account) private accountRepository: Repository<Account>,
    @Inject(ConvertException) private convertException: ConvertException,
    @InjectRepository(Admin) private adminRepository: Repository<Admin>,
    @InjectRepository(AccountFile) private fileRepository: Repository<AccountFile>,
    @Inject('accountFile') private accountFileDb: AccountFileDb,
    private eventBus: EventBus,
  ) {}

  /**
   * 관리자 정보 수정 메소드
   * @param command : 관리자 정보 수정에 필요한 파라미터
   * @returns : DB처리 실패 시 에러 메시지 반환 / 수정 성공 시 수정된 정보 반환
   */
  async execute(command: AdminUpdateInfoCommand) {
    const { accountId, email, phone, nickname, file } = command;
    const account = await this.accountRepository.findOneBy({ accountId: accountId });

    if (email) {
      try {
        // const isEmailExist = this.accountRepository.findOneBy( {email} )
        const isEmailExist = await this.accountRepository.findOne({ where: { email } });
        if (isEmailExist) {
          return this.convertException.badRequestAccountError(
            '이미 존재하는 이메일이므로 수정',
            400,
          );
        } else {
          const updateEmail = this.accountRepository.update(
            { accountId },
            {
              email: email,
            },
          );
          console.log(updateEmail);
        }
      } catch (err) {
        console.log(err);
      }
    }

    if (phone) {
      try {
        const isPhoneExist = await this.accountRepository.findOne({ where: { phone } });
        if (isPhoneExist) {
          return this.convertException.badRequestAccountError(
            '이미 존재하는 연락처이므로 수정',
            400,
          );
        } else {
          const updatePhone = this.accountRepository.update(
            {
              accountId,
            },
            {
              phone: phone,
            },
          );
          console.log(updatePhone);
        }
      } catch (err) {
        console.log(err);
      }
    }

    if (nickname) {
      try {
        const isNicknameExist = await this.accountRepository.findOne({ where: { nickname } });
        if (isNicknameExist) {
          return this.convertException.badRequestAccountError(
            '이미 존재하는 닉네임이므로 수정',
            400,
          );
        } else {
          const updateNickname = this.accountRepository.update(
            {
              accountId,
            },
            {
              nickname: nickname,
            },
          );
          console.log(updateNickname);
        }
      } catch (err) {
        console.log(err);
      }
    }

    const accountFile = await this.fileRepository.findOneBy({ accountId: accountId });

    if (file) {
      // 저장되어 있는 프로필 이미지가 있다면 '수정' 이벤트 호출
      if (accountFile) {
        this.eventBus.publish(
          new FileUpdateEvent(accountId, FileType.ACCOUNT, file, this.accountFileDb),
        );
        // 저장되어 있는 프로필 이미지가 없다면 '등록' 이벤트 호출
      } else {
        this.eventBus.publish(
          new FileCreateEvent(accountId, FileType.ACCOUNT, file, this.accountFileDb),
        );
      }
    }

    return account;
  }
}
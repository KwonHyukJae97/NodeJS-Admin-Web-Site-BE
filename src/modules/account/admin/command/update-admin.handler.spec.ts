import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslatorModule } from 'nestjs-translator';
import { Account } from '../../entities/account';
import { AccountFile } from '../../../file/entities/account-file.entity';
import { AccountFileDb } from '../../account-file-db';
import { ConvertException } from '../../../../common/utils/convert-exception';
import { EventBus } from '@nestjs/cqrs';
import { UpdateAdminHandler } from './update-admin.handler';
import { Admin } from '../entities/admin';
import { UpdateAdminCommand } from './update-admin.command';
import * as bcrypt from 'bcryptjs';

const mockRepository = () => ({
  save: jest.fn(),
  findOneBy: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UpdateAdmin', () => {
  let updateAdminHandler: UpdateAdminHandler;
  let adminRepository: MockRepository<Admin>;
  let accountRepository: MockRepository<Account>;
  let accountFileRepository: MockRepository<AccountFile>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TranslatorModule.forRoot({
          global: true,
          defaultLang: 'ko',
          translationSource: '/src/common/i18n',
        }),
      ],
      providers: [
        UpdateAdminHandler,
        ConvertException,
        AccountFileDb,
        {
          provide: getRepositoryToken(Admin),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Account),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(AccountFile),
          useValue: mockRepository(),
        },
        {
          provide: 'accountFile',
          useClass: AccountFileDb,
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    updateAdminHandler = module.get(UpdateAdminHandler);
    adminRepository = module.get(getRepositoryToken(Admin));
    accountRepository = module.get(getRepositoryToken(Account));
    accountFileRepository = module.get(getRepositoryToken(AccountFile));
    eventBus = module.get(EventBus);
  });

  describe('????????? ?????? ?????? ?????? ??????', () => {
    const mockFile = [
      {
        fieldname: 'file',
        originalname: 'medal.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from(__dirname + '/../../medal.png', 'utf8'),
        size: 51828,
      },
    ] as Express.MulterS3.File[];

    // ??????????????? ?????? ???
    const newAdminInfo = {
      roleId: 1,
      password: 'password',
      email: 'test@email.com',
      phone: '010-0000-0000',
      nickname: '????????? ??????',
      adminId: 1,
      isSuper: true,
      file: mockFile,
    };

    // ?????? ???(admin)
    const adminInfo = {
      accountId: 1,
      companyId: 1,
      roleId: 1,
      isSuper: false,
    };

    // ?????? ???(account)
    const accountInfo = {
      accountId: 1,
      id: 'test',
      name: '??????',
      email: 'email@email.com',
      phone: '010-1111-1111',
      nickname: '?????????',
      birth: '20221202',
      gender: '0',
    };

    // ?????? ?????? ????????? ?????? ?????? ???(admin)
    const updateAdminInfo = {
      accountId: 1,
      companyId: 1,
      roleId: 2,
      isSuper: true,
    };

    // ?????? ?????? ????????? ?????? ?????? ???(account)
    const updateAccountInfo = {
      accountId: 1,
      id: 'test',
      name: '??????',
      email: 'test@email.com',
      phone: '010-0000-0000',
      nickname: '????????? ??????',
      birth: '20221202',
      gender: '0',
    };

    // ?????? ?????? ???
    const resultAdminInfo = {
      accountId: 1,
      id: 'test',
      password: '$2a$10$9BXY43cplwHcQYkwt6FEgeM2q.edMDehiGPzN3Fn6GASzZ9QrNOYq',
      name: '??????',
      email: 'test@email.com',
      phone: '010-0000-0000',
      nickname: '????????? ??????',
      birth: '20221202',
      gender: '0',
    };

    it('????????? ?????? ?????? ??????', async () => {
      adminRepository.findOneBy.mockResolvedValue(adminInfo);
      accountRepository.findOneBy.mockResolvedValue(accountInfo);
      adminRepository.save.mockResolvedValueOnce(updateAdminInfo);
      adminRepository.save.mockResolvedValueOnce(updateAdminInfo);
      jest.spyOn(bcrypt, 'genSalt');
      jest.spyOn(bcrypt, 'hash');
      accountRepository.save.mockResolvedValue(updateAccountInfo);
      accountFileRepository.findOneBy(adminInfo.accountId);

      const result = await updateAdminHandler.execute(
        new UpdateAdminCommand(
          newAdminInfo.password,
          newAdminInfo.email,
          newAdminInfo.phone,
          newAdminInfo.nickname,
          newAdminInfo.roleId,
          newAdminInfo.isSuper,
          newAdminInfo.adminId,
          newAdminInfo.file,
        ),
      );

      if (result instanceof Account) {
        expect(result.email).toEqual(resultAdminInfo.email);
        expect(result.nickname).toEqual(resultAdminInfo.nickname);
        expect(result.phone).toEqual(resultAdminInfo.phone);
      }
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('?????? ????????? ????????? ?????? ?????? 400 ?????? ??????', async () => {
      adminRepository.findOneBy.mockResolvedValue(adminInfo);
      accountRepository.findOneBy.mockResolvedValue(accountInfo);
      adminRepository.save.mockRejectedValue(adminInfo);

      try {
        const result = await updateAdminHandler.execute(
          new UpdateAdminCommand(
            newAdminInfo.password,
            newAdminInfo.email,
            newAdminInfo.phone,
            newAdminInfo.nickname,
            newAdminInfo.roleId,
            newAdminInfo.isSuper,
            newAdminInfo.adminId,
            newAdminInfo.file,
          ),
        );
        expect(result).toBeDefined();
      } catch (err) {
        expect(err.status).toBe(400);
        expect(err.response).toBe('???????????????????????? ????????? ??????????????????.');
      }
    });

    it('????????? ?????? ????????? ????????? ?????? ?????? 400 ?????? ??????', async () => {
      adminRepository.findOneBy.mockResolvedValue(adminInfo);
      accountRepository.findOneBy.mockResolvedValue(accountInfo);
      adminRepository.save.mockResolvedValueOnce(updateAdminInfo);
      adminRepository.save.mockRejectedValue(updateAdminInfo);

      try {
        const result = await updateAdminHandler.execute(
          new UpdateAdminCommand(
            newAdminInfo.password,
            newAdminInfo.email,
            newAdminInfo.phone,
            newAdminInfo.nickname,
            newAdminInfo.roleId,
            newAdminInfo.isSuper,
            newAdminInfo.adminId,
            newAdminInfo.file,
          ),
        );
        expect(result).toBeDefined();
      } catch (err) {
        expect(err.status).toBe(400);
        expect(err.response).toBe('??????????????????????????? ????????? ??????????????????.');
      }
    });

    it('?????? ????????? ????????? ?????? ?????? 500 ?????? ??????', async () => {
      adminRepository.findOneBy.mockResolvedValue(adminInfo);
      accountRepository.findOneBy.mockResolvedValue(accountInfo);
      adminRepository.save.mockResolvedValue(updateAdminInfo);
      accountRepository.save.mockRejectedValue(updateAccountInfo);

      try {
        const result = await updateAdminHandler.execute(
          new UpdateAdminCommand(
            newAdminInfo.password,
            newAdminInfo.email,
            newAdminInfo.phone,
            newAdminInfo.nickname,
            newAdminInfo.roleId,
            newAdminInfo.isSuper,
            newAdminInfo.adminId,
            newAdminInfo.file,
          ),
        );
        expect(result).toBeDefined();
      } catch (err) {
        expect(err.status).toBe(500);
        expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
      }
    });
  });
});

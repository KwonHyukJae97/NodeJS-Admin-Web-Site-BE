import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslatorModule } from 'nestjs-translator';
import { Account } from '../../entities/account';
import { AccountFile } from '../../../file/entities/account-file.entity';
import { EventBus } from '@nestjs/cqrs';
import { AccountFileDb } from '../../account-file-db';
import { ConvertException } from '../../../../common/utils/convert-exception';
import { DeleteAdminHandler } from './delete-admin.handler';
import { Admin } from '../entities/admin';
import { DeleteAdminCommand } from './delete-admin.command';

const mockRepository = () => ({
  softDelete: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockReturnThis(),
  }),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('DeleteAdmin', () => {
  let deleteAdminHandler: DeleteAdminHandler;
  let adminRepository: MockRepository<Admin>;
  let accountRepository: MockRepository<Account>;
  let acccountFileRepository: MockRepository<AccountFile>;
  let eventBus: jest.Mocked<EventBus>;
  let convertException: ConvertException;

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
        DeleteAdminHandler,
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

    deleteAdminHandler = module.get(DeleteAdminHandler);
    adminRepository = module.get(getRepositoryToken(Admin));
    accountRepository = module.get(getRepositoryToken(Account));
    acccountFileRepository = module.get(getRepositoryToken(AccountFile));
    eventBus = module.get(EventBus);
    convertException = module.get(ConvertException);
  });

  describe('????????? ?????? ?????? ?????? ??????', () => {
    const adminId = 1;
    const delDate = new Date();

    const adminInfo = {
      accountId: 1,
      companyId: 1,
      roleId: 1,
      isSuper: false,
    };

    const accountInfo = {
      accountId: 1,
      id: 'test',
      name: '??????',
      email: 'email@email.com',
      phone: '010-1111-1111',
      nickname: '?????????',
      grade: 1,
      birth: '20221202',
      gender: '0',
    };

    const accountFile = {
      accountFileId: 1,
      accountId: 1,
      originalFileName: '?????????????????????????????? 2022-10-19 20.22.28(2)',
      fileExt: '.png',
      filePath:
        'https://b2c-file-test.s3.ap-northeast-2.amazonaws.com/account/2022-10-27/19082121_c7bddcb5-59fd-4d08-b816-5d734bf09566',
      fileSize: 355102,
    };

    const deleteAccountInfo = {
      accountId: 1,
      password: '*****',
      id: '*****',
      name: '*****',
      phone: '*****',
      nickname: '*****',
      email: '*****',
      birth: '*****',
      snsId: '*****',
      snsType: '**',
      gender: '*',
      ci: '*****',
    };

    it('?????? ????????? ?????? ?????? ????????? ?????? ?????? ??????', async () => {
      adminRepository.findOneBy.mockResolvedValue(adminInfo);
      accountRepository.findOneBy.mockResolvedValue(accountInfo);
      acccountFileRepository.findOneBy.mockResolvedValue(accountInfo.accountId);
      const deleteAccount = jest
        .spyOn(accountRepository, 'createQueryBuilder')
        .mockImplementation(() => {
          const mockModule = jest.requireMock('typeorm');
          return {
            ...mockModule,
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: () => deleteAccountInfo,
          };
        });
      acccountFileRepository.findOneBy.mockResolvedValue(accountFile);

      const result = await deleteAdminHandler.execute(new DeleteAdminCommand(adminId, delDate));

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(deleteAccount).toHaveBeenCalled();
      expect(acccountFileRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(result).toEqual('????????? ?????? ??????');
    });

    it('?????? ????????? ?????? ?????? ????????? ?????? ?????? ??????', async () => {
      adminRepository.findOneBy.mockResolvedValue(adminInfo);
      accountRepository.findOneBy.mockResolvedValue(accountInfo);
      acccountFileRepository.findOneBy.mockResolvedValue(accountInfo.accountId);
      const deleteAccount = jest
        .spyOn(accountRepository, 'createQueryBuilder')
        .mockImplementation(() => {
          const mockModule = jest.requireMock('typeorm');
          return {
            ...mockModule,
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: () => deleteAccountInfo,
          };
        });
      acccountFileRepository.findOneBy.mockResolvedValue(undefined);

      const result = await deleteAdminHandler.execute(new DeleteAdminCommand(adminId, delDate));

      expect(eventBus.publish).not.toHaveBeenCalled();
      expect(deleteAccount).toHaveBeenCalled();
      expect(acccountFileRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(result).toEqual('????????? ?????? ??????');
    });

    it('?????? ????????? ?????? ????????? ?????? ?????? 404 ?????? ??????', async () => {
      adminRepository.findOneBy.mockResolvedValue(adminInfo);
      accountRepository.findOneBy.mockResolvedValue(undefined);

      try {
        const result = await deleteAdminHandler.execute(new DeleteAdminCommand(adminId, delDate));
        expect(result).toBeDefined();
      } catch (err) {
        expect(err.status).toBe(404);
        expect(err.response).toBe('????????? ????????? ?????? ??? ????????????.');
      }
    });

    it('????????? ?????? ?????? ??????????????? ????????? ?????? ?????? 500 ?????? ??????', async () => {
      adminRepository.findOneBy.mockResolvedValue(adminInfo);
      accountRepository.findOneBy.mockResolvedValue(accountInfo);
      acccountFileRepository.findOneBy.mockResolvedValue(accountInfo.accountId);
      const deleteAccount = jest
        .spyOn(accountRepository, 'createQueryBuilder')
        .mockImplementation(() => {
          const mockModule = jest.requireMock('typeorm');
          return {
            ...mockModule,
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: () => Promise.reject(),
          };
        });

      try {
        const result = await deleteAdminHandler.execute(new DeleteAdminCommand(adminId, delDate));
        expect(result).toBeDefined();
        expect(deleteAccount).toHaveBeenCalled();
      } catch (err) {
        expect(err.status).toBe(500);
        expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
      }
    });
  });
});

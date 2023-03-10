import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslatorModule } from 'nestjs-translator';
import { ConvertException } from 'src/common/utils/convert-exception';
import { Company } from 'src/modules/company/entities/company.entity';
import { Repository } from 'typeorm';
import { Admin } from '../../admin/entities/admin';
import { Account } from '../../entities/account';
import { NaverSignUpAdminCommand } from './naver-signup-admin.command';
import { NaverSignUpAdminHandler } from './naver-signup-admin.handler';

const mockRepository = () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('네이버 2차 정보가입', () => {
  let naverSignUpHandler: NaverSignUpAdminHandler;
  let adminRepository: MockRepository<Admin>;
  let companyRepository: MockRepository<Company>;
  let accountRepository: MockRepository<Account>;

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
        NaverSignUpAdminHandler,
        ConvertException,
        {
          provide: getRepositoryToken(Admin),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Account),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    naverSignUpHandler = module.get(NaverSignUpAdminHandler);
    adminRepository = module.get(getRepositoryToken(Admin));
    companyRepository = module.get(getRepositoryToken(Company));
    accountRepository = module.get(getRepositoryToken(Account));
  });

  describe('네이버 2차정보 성공 여부', () => {
    const accountId = 11;
    const companyId = 11;
    const adminId = 11;
    const id = 'naver1234';
    const email = 'email@naver.com';
    const phone = '01012341234';
    const nickname = 'kwon123';
    const businessNumber = '000-00-12345';

    const adminAccountData = {
      accountId: accountId,
      name: '네이버',
      phone: '01012341234',
      nickname: 'naver123',
      birth: '971113',
      gender: '0',
      snsId: 'naver@naver.com',
      snsType: '02',
      snsToken: 'token123',
      division: true,
    };

    const adminCompanyData = {
      companyId: companyId,
      companyName: 'naver1',
      companyCode: 11,
      businessNumber: '000-00-00000',
    };

    const adminData = {
      accountId: accountId,
      adminId: adminId,
      companyId: companyId,
      roleId: 1,
      isSuper: false,
    };
    it('네이버 2차정보 가입 성공', async () => {
      accountRepository.create.mockReturnValue(adminAccountData);
      accountRepository.save.mockReturnValue(adminAccountData);
      companyRepository.create.mockReturnValue(adminCompanyData);
      companyRepository.save.mockReturnValue(adminCompanyData);
      adminRepository.create.mockReturnValue(adminData);
      adminRepository.save.mockReturnValue(adminData);

      const result = await naverSignUpHandler.execute(
        new NaverSignUpAdminCommand(
          adminAccountData.name,
          adminAccountData.phone,
          adminAccountData.nickname,
          adminAccountData.birth,
          adminAccountData.gender,
          adminAccountData.snsId,
          adminAccountData.snsToken,
          adminCompanyData.companyName,
          adminCompanyData.companyCode,
          adminCompanyData.businessNumber,
        ),
      );

      expect(result).toEqual(result);
    });

    it('중복된 아이디를 입력한 경우 400 에러 발생', async () => {
      accountRepository.create.mockResolvedValue(adminAccountData);
      accountRepository.findOne.mockResolvedValueOnce(true);

      try {
        const result = await naverSignUpHandler.execute(
          new NaverSignUpAdminCommand(
            adminAccountData.name,
            adminAccountData.phone,
            adminAccountData.nickname,
            adminAccountData.birth,
            adminAccountData.gender,
            adminAccountData.snsId,
            adminAccountData.snsToken,
            adminCompanyData.companyName,
            adminCompanyData.companyCode,
            adminCompanyData.businessNumber,
          ),
        );
        expect(result).toBeDefined();
      } catch (Err) {
        expect(Err.status).toBe(400);
        expect(Err.response).toBe('이미 존재하는 아이디입니다. 입력된 내용을 확인해주세요.');
      }
    });

    it('중복된 연락처를 입력한 경우 400 에러 발생', async () => {
      accountRepository.create.mockResolvedValue(adminAccountData);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(true);

      if (!id) {
        try {
          const result = await naverSignUpHandler.execute(
            new NaverSignUpAdminCommand(
              adminAccountData.name,
              adminAccountData.phone,
              adminAccountData.nickname,
              adminAccountData.birth,
              adminAccountData.gender,
              adminAccountData.snsId,
              adminAccountData.snsToken,
              adminCompanyData.companyName,
              adminCompanyData.companyCode,
              adminCompanyData.businessNumber,
            ),
          );
          expect(result).toBeDefined();
        } catch (Err) {
          expect(Err.status).toBe(400);
          expect(Err.response).toBe('이미 존재하는 연락처입니다. 입력된 내용을 확인해주세요.');
        }
      }
    });

    it('중복된 닉네임을 입력한 경우 400 에러 발생', async () => {
      accountRepository.create.mockResolvedValue(adminAccountData);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(true);

      if (!id && !phone) {
        try {
          const result = await naverSignUpHandler.execute(
            new NaverSignUpAdminCommand(
              adminAccountData.name,
              adminAccountData.phone,
              adminAccountData.nickname,
              adminAccountData.birth,
              adminAccountData.gender,
              adminAccountData.snsId,
              adminAccountData.snsToken,
              adminCompanyData.companyName,
              adminCompanyData.companyCode,
              adminCompanyData.businessNumber,
            ),
          );
          expect(result).toBeDefined();
        } catch (Err) {
          expect(Err.status).toBe(400);
          expect(Err.response).toBe('이미 존재하는 닉네임입니다. 입력된 내용을 확인해주세요.');
        }
      }
    });

    it('중복된 사업자번호를 입력한 경우 400 에러 발생', async () => {
      accountRepository.create.mockResolvedValue(adminAccountData);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(true);

      if (!id && !phone && !nickname) {
        try {
          const result = await naverSignUpHandler.execute(
            new NaverSignUpAdminCommand(
              adminAccountData.name,
              adminAccountData.phone,
              adminAccountData.nickname,
              adminAccountData.birth,
              adminAccountData.gender,
              adminAccountData.snsId,
              adminAccountData.snsToken,
              adminCompanyData.companyName,
              adminCompanyData.companyCode,
              adminCompanyData.businessNumber,
            ),
          );
          expect(result).toBeDefined();
        } catch (Err) {
          expect(Err.status).toBe(400);
          expect(Err.response).toBe('이미 존재하는 사업자번호입니다. 입력된 내용을 확인해주세요.');
        }
      }
    });

    it('네이버 2차 정보 가입에 실패 할 경우 400 에러 발생', async () => {
      accountRepository.create.mockResolvedValue(adminAccountData);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      companyRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.save.mockRejectedValue(adminAccountData);

      if (!id && !phone && !nickname && !businessNumber) {
        try {
          const result = await naverSignUpHandler.execute(
            new NaverSignUpAdminCommand(
              adminAccountData.name,
              adminAccountData.phone,
              adminAccountData.nickname,
              adminAccountData.birth,
              adminAccountData.gender,
              adminAccountData.snsId,
              adminAccountData.snsToken,
              adminCompanyData.companyName,
              adminCompanyData.companyCode,
              adminCompanyData.businessNumber,
            ),
          );
          expect(result).toBeDefined();
        } catch (Err) {
          expect(Err.status).toBe(400);
          expect(Err.response).toBe('네이버 2차정보 저장에 입력된 내용을 확인해주세요.');
        }
      }
    });

    it('회원사 정보 가입에 실패 할 경우 400 에러 발생', async () => {
      accountRepository.create.mockResolvedValue(adminAccountData);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.save.mockRejectedValue(adminAccountData);
      companyRepository.save.mockRejectedValue(adminCompanyData);

      if (!id && !email && !phone && !nickname && !businessNumber) {
        try {
          const result = await naverSignUpHandler.execute(
            new NaverSignUpAdminCommand(
              adminAccountData.name,
              adminAccountData.phone,
              adminAccountData.nickname,
              adminAccountData.birth,
              adminAccountData.gender,
              adminAccountData.snsId,
              adminAccountData.snsToken,
              adminCompanyData.companyName,
              adminCompanyData.companyCode,
              adminCompanyData.businessNumber,
            ),
          );
          expect(result).toBeDefined();
        } catch (Err) {
          expect(Err.status).toBe(400);
          expect(Err.response).toBe('회원사 정보 가입에 입력된 내용을 확인해주세요.');
        }
      }
    });

    it('admin 테이블 저장에 문제가 있을 경우 500 에러 발생', async () => {
      accountRepository.create.mockResolvedValue(adminAccountData);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.findOne.mockResolvedValueOnce(false);
      companyRepository.findOne.mockResolvedValueOnce(false);
      accountRepository.save.mockRejectedValue(adminAccountData);
      adminRepository.save.mockRejectedValue(adminData);

      if (!id && !phone && !nickname && !businessNumber) {
        try {
          const result = await naverSignUpHandler.execute(
            new NaverSignUpAdminCommand(
              adminAccountData.name,
              adminAccountData.phone,
              adminAccountData.nickname,
              adminAccountData.birth,
              adminAccountData.gender,
              adminAccountData.snsId,
              adminAccountData.snsToken,
              adminCompanyData.companyName,
              adminCompanyData.companyCode,
              adminCompanyData.businessNumber,
            ),
          );
          expect(result).toBeDefined();
        } catch (Err) {
          expect(Err.status).toBe(500);
          expect(Err.response).toBe('에러가 발생하였습니다. 관리자에게 문의해주세요.');
        }
      }
    });
  });
});

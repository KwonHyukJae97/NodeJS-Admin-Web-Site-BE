import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ConvertException } from '../../../common/utils/convert-exception';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranslatorModule } from 'nestjs-translator';
import { UpdateCompanyHandler } from './update-company.handler';
import { Company } from '../entities/company.entity';
import { UpdateCompanyCommand } from './update-company.command';

const mockRepository = () => ({
  save: jest.fn(),
  findOneBy: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UpdateCompany', () => {
  let updateCompanyHandler: UpdateCompanyHandler;
  let companyRepository: MockRepository<Company>;

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
        UpdateCompanyHandler,
        ConvertException,
        {
          provide: getRepositoryToken(Company),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    updateCompanyHandler = module.get(UpdateCompanyHandler);
    companyRepository = module.get(getRepositoryToken(Company));
  });

  describe('회원사 정보 정상 수정 여부', () => {
    const companyId = { companyId: 1 };
    const companyInfo = {
      companyName: '회원사',
      businessNumber: '123-45-67890',
      companyId: 1,
    };

    const newCompanyInfo = {
      companyName: '회원사명 수정',
      businessNumber: '123-45-67890',
      companyId: 1,
    };
    it('회원사 정보 수정 성공', async () => {
      companyRepository.findOneBy.mockResolvedValue(companyInfo);

      companyRepository.save.mockResolvedValue(newCompanyInfo);

      const result = await updateCompanyHandler.execute(
        new UpdateCompanyCommand(
          newCompanyInfo.companyName,
          newCompanyInfo.businessNumber,
          newCompanyInfo.companyId,
        ),
      );

      expect(result).toEqual(newCompanyInfo);
    });

    it('회원사 정보가 없을 경우 404 에러 발생', async () => {
      companyRepository.findOneBy.mockResolvedValue(companyId);

      try {
        const result = await updateCompanyHandler.execute(
          new UpdateCompanyCommand(
            newCompanyInfo.companyName,
            newCompanyInfo.businessNumber,
            companyId.companyId,
          ),
        );
        expect(result).toBeDefined();
      } catch (Err) {
        expect(Err.status).toBe(404);
        expect(Err.response).toBe('회원사 정보를 찾을 수 없습니다.');
      }
    });

    it('회원사 정보에 문제가 있을 경우 400 에러 발생', async () => {
      companyRepository.findOneBy.mockResolvedValue(companyId);
      companyRepository.save.mockResolvedValue(newCompanyInfo);

      try {
        const result = await updateCompanyHandler.execute(
          new UpdateCompanyCommand(
            newCompanyInfo.companyName,
            newCompanyInfo.businessNumber,
            companyId.companyId,
          ),
        );
        expect(result).toBeDefined();
      } catch (Err) {
        expect(Err.status).toBe(400);
        expect(Err.response).toBe('회원사 정보에입력된 내용을 확인해주세요.');
      }
    });
  });
});

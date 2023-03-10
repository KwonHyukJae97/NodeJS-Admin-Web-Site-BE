import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { ConvertException } from 'src/common/utils/convert-exception';
import { TranslatorModule } from 'nestjs-translator';
import { Account } from '../entities/account';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { EmailService } from 'src/modules/email/email.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import * as uuid from 'uuid';
import * as bcrypt from 'bcrypt';
import { AuthController } from './auth.controller';

const mockRepository = () => ({
  update: jest.fn(async () => await Promise.resolve()),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
});

const mockEmailService = () => ({
  sendTempPassword: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
type MockService<T = any> = Partial<Record<keyof T, jest.Mock>>;

describe('Auth Service', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let emailService: MockService<EmailService>;
  let accountRepository: MockRepository<Account>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: `.${process.env.NODE_ENV}.env`,
          isGlobal: true,
        }),
        TranslatorModule.forRoot({
          global: true,
          defaultLang: 'ko',
          translationSource: '/src/common/i18n',
        }),
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.get<string>('JWT_ACCESS_TOKEN_SECRET'),
            signOptions: {
              expiresIn: `${config.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
            },
          }),
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtService,
        ConfigService,
        ConvertException,
        {
          provide: getRepositoryToken(Account),
          useValue: mockRepository(),
        },
        {
          provide: Connection,
          useClass: class MockConnection {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'JWT_REFRESH_TOKEN_SECRET') {
                return 'refresh_token';
              }
              if (key === 'JWT_REFRESH_TOKEN_EXPIRATION_TIME') {
                return 3600;
              }
              if (key === 'JWT_ACCESS_TOKEN_SECRET') {
                return 'access_token';
              }
              if (key === 'JWT_ACCESS_TOKEN_EXPIRATION_TIME') {
                return 3600;
              }
              return null;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload, option) => {
              return 'TOKEN';
            }),
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: uuid,
          useValue: {
            v4: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: mockEmailService(),
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    emailService = module.get(EmailService);
    accountRepository = module.get(getRepositoryToken(Account));
    jwtService = module.get(JwtService);
  });

  describe('?????? ???????????? ?????? ?????? ??????', () => {
    const Dto = { email: 'email@email.co.kr' };
    const tempUUID = uuid.v4();
    const tempPassword = tempUUID.split('-')[0];
    const user = {
      accountId: '1',
      id: 'test',
      password: '$2b$10$TtoRALAr8GVpJibZ4xU2N.cPT3ZK.WBgxDCnIQVWs.X0/HE4vqbge',
      name: '?????????',
      email: 'email@email.co.kr',
      phone: '010-2323-1212',
      nickname: 'test1234',
      birth: '19880909',
      gender: '0',
      currentHashedRefreshToken: null,
      ci: null,
      snsId: null,
      snsType: null,
      snsToken: null,
      regDate: '2022-09-26T18:21:23.000Z',
      updateDate: '2022-12-06T18:32:07.000Z',
      delDate: null,
      loginDate: null,
      division: null,
    };

    it('?????? ???????????? ?????? ??????', async () => {
      const salt = bcrypt.genSalt();
      const hashedPassword = bcrypt.hash(tempPassword, await salt);

      accountRepository.findOne.mockResolvedValue(user);
      accountRepository.update.mockResolvedValue(hashedPassword);
      emailService.sendTempPassword.mockReturnValue(Dto.email);

      const result = await authService.findPassword(Dto);

      expect(result.message).toEqual('???????????? ??????????????????.');
    });

    it('???????????? ?????????', async () => {
      try {
        accountRepository.findOne.mockResolvedValueOnce(undefined);
        const result = await authService.findPassword(Dto);
        expect(result).toBeUndefined();
      } catch (err) {
        expect(err.status).toBe(400);
        expect(err.response.message).toBe('?????? ????????? ???????????? ????????????.');
      }
    });

    it('???????????? ?????? ??????', async () => {
      try {
        await accountRepository.update.mockRejectedValue(undefined);
        throw new Error('???????????? ?????? ???????????????. ?????? ??????????????????.');
      } catch (e) {
        expect(e.message).toBe('???????????? ?????? ???????????????. ?????? ??????????????????.');
      }
    });
    describe('setCurrentRefreshToken', () => {
      it('?????? ????????? ??? ???????????? ?????? ?????? ?????? ???????????? ??????', async () => {
        const refreshToken = 'TOKEN';
        const id = 'test';

        jest.spyOn(bcrypt, 'hash');
        jest.spyOn(accountRepository, 'update');

        const result = await authService.setCurrentRefreshToken(refreshToken, id);

        expect(result).toBeUndefined();
        expect(bcrypt.hash).toHaveBeenCalled();
        expect(accountRepository.update).toHaveBeenCalled();
      });

      it('?????? ????????? ??? ???????????? ?????? ?????? ?????? ???????????? ??????', async () => {
        const refreshToken = 'TOKEN';
        const id = 'test';

        jest.spyOn(bcrypt, 'hash');
        jest.spyOn(accountRepository, 'update').mockRejectedValue(null);

        try {
          const result = await authService.setCurrentRefreshToken(refreshToken, id);
          expect(result).toBeDefined();
          expect(bcrypt.hash).toHaveBeenCalled();
        } catch (err) {
          expect(err.status).toBe(500);
          expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
        }
      });
    });

    describe('setSocialCurrentRefreshToken', () => {
      it('?????? ????????? ??? ???????????? ?????? ?????? ?????? ???????????? ??????', async () => {
        const refreshToken = 'TOKEN';
        const snsId = 'kakao@email.com';

        jest.spyOn(bcrypt, 'hash');
        jest.spyOn(accountRepository, 'update');

        const result = await authService.setSocialCurrentRefreshToken(refreshToken, snsId);

        expect(result).toBeUndefined();
        expect(bcrypt.hash).toHaveBeenCalled();
        expect(accountRepository.update).toHaveBeenCalled();
      });

      it('?????? ????????? ??? ???????????? ?????? ?????? ?????? ???????????? ??????', async () => {
        const refreshToken = 'TOKEN';
        const snsId = 'kakao@email.com';

        jest.spyOn(bcrypt, 'hash');
        jest.spyOn(accountRepository, 'update').mockRejectedValue(null);

        try {
          const result = await authService.setSocialCurrentRefreshToken(refreshToken, snsId);
          expect(result).toBeDefined();
          expect(bcrypt.hash).toHaveBeenCalled();
        } catch (err) {
          expect(err.status).toBe(500);
          expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
        }
      });
    });

    describe('setSocialToken', () => {
      it('?????? ????????? ??? sns ?????? ?????? ?????? ???????????? ??????', async () => {
        const snsToken = 'TOKEN';
        const snsId = 'kakao@email.com';

        jest.spyOn(bcrypt, 'hash');
        jest.spyOn(accountRepository, 'update');

        const result = await authService.setSocialToken(snsToken, snsId);

        expect(result).toBeUndefined();
        expect(bcrypt.hash).toHaveBeenCalled();
        expect(accountRepository.update).toHaveBeenCalled();
      });

      it('?????? ????????? ??? sns ?????? ?????? ?????? ???????????? ??????', async () => {
        const snsToken = 'TOKEN';
        const snsId = 'kakao@email.com';

        jest.spyOn(bcrypt, 'hash');
        jest.spyOn(accountRepository, 'update').mockRejectedValue(null);

        try {
          const result = await authService.setSocialToken(snsToken, snsId);
          expect(result).toBeDefined();
          expect(bcrypt.hash).toHaveBeenCalled();
        } catch (err) {
          expect(err.status).toBe(500);
          expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
        }
      });
    });

    describe('getCookieWithJwtAccessToken', () => {
      it('?????? ????????? ??? ????????? ?????? ?????? ??????', () => {
        const id = 'test';
        const snsType = '00';

        const returnAccessToken = {
          accessToken: 'TOKEN',
          accessOption: {
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            maxAge: 3600000,
          },
        };

        const result = authService.getCookieWithJwtAccessToken(id, snsType);

        expect(result).toBeDefined();
        expect(result).toEqual(returnAccessToken);
      });
    });

    describe('socialGetCookieWithJwtAccessToken', () => {
      it('?????? ????????? ??? ????????? ?????? ?????? ??????', () => {
        const snsId = 'kakao@email.com';
        const snsType = '00';

        const returnAccessToken = {
          accessToken: 'TOKEN',
          accessOption: {
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            maxAge: 3600000,
          },
        };

        const result = authService.socialGetCookieWithJwtAccessToken(snsId, snsType);

        expect(result).toBeDefined();
        expect(result).toEqual(returnAccessToken);
      });
    });

    describe('getCookieWithJwtRefreshToken', () => {
      it('?????? ????????? ??? ???????????? ?????? ?????? ?????? ??????', () => {
        const id = 'test';
        const snsType = '00';

        const returnRefreshToken = {
          refreshToken: 'TOKEN',
          refreshOption: {
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            maxAge: 3600000,
          },
        };

        const result = authService.getCookieWithJwtRefreshToken(id, snsType);

        expect(result).toBeDefined();
        expect(result).toEqual(returnRefreshToken);
      });
    });

    describe('socialGetCookieWithJwtRefreshToken', () => {
      it('?????? ????????? ??? ???????????? ?????? ?????? ?????? ??????', () => {
        const snsId = 'kakao@email.com';
        const snsType = '00';

        const returnRefreshToken = {
          refreshToken: 'TOKEN',
          refreshOption: {
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            maxAge: 3600000,
          },
        };

        const result = authService.socialGetCookieWithJwtRefreshToken(snsId, snsType);

        expect(result).toBeDefined();
        expect(result).toEqual(returnRefreshToken);
      });
    });

    describe('getCookiesForLogOut', () => {
      it('???????????? ??? ?????????/???????????? ?????? ?????? ????????? ??????', () => {
        const result = authService.getCookiesForLogOut();

        expect(result).toBeDefined();
      });
    });

    describe('removeRefreshToken', () => {
      it('???????????? ??? ???????????? ?????? ?????? ??? ?????? ???????????? ??????', async () => {
        const accountId = 1;

        const updateAccount = {
          accountId: 1,
          name: '??????',
          email: 'admin@kakao.com',
          phone: '010-2345-6069',
          nickname: '??????',
          birth: '20220909',
          gender: '0',
          division: true,
          currentHashedRefreshToken: null,
        };

        accountRepository.update.mockResolvedValue(updateAccount);

        const result = await authService.removeRefreshToken(accountId);

        expect(result).toBeDefined();
        expect(accountRepository.update).toHaveBeenCalledTimes(1);
      });

      it('???????????? ??? ???????????? ?????? ?????? ??? ?????? ???????????? ??????', async () => {
        const accountId = 1;

        const updateAccount = {
          accountId: 1,
          name: '??????',
          email: 'admin@kakao.com',
          phone: '010-2345-6069',
          nickname: '??????',
          birth: '20220909',
          gender: '0',
          division: true,
          currentHashedRefreshToken: null,
        };

        accountRepository.update.mockRejectedValue(updateAccount);

        try {
          const result = await authService.removeRefreshToken(accountId);
          expect(result).toBeDefined();
        } catch (err) {
          expect(err.status).toBe(500);
          expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
        }
      });
    });

    describe('kakaoUserInfos', () => {
      const adminKakaoDto = {
        name: '??????',
        email: 'admin@kakao.com',
        birth: '20220909',
        snsId: 'kakao',
        snsType: '01',
        snsToken: '',
        gender: '0',
        accessToken: '',
        resKakaoAccessToken: '',
      };

      const findAccount = {
        name: '??????',
        email: 'admin@kakao.com',
        phone: '010-2345-6069',
        nickname: '??????',
        birth: '20220909',
        snsId: 'kakao',
        snsType: '01',
        snsToken: '',
        gender: '0',
        division: true,
      };

      it('?????? ????????? ?????? ?????? loginSuccess: true ??????', async () => {
        accountRepository.findOne.mockResolvedValue(findAccount);

        const result = await authService.kakaoUserInfos(adminKakaoDto);

        expect(result).toEqual({ loginSuccess: true });
      });

      it('?????? ????????? ?????? ?????? loginSuccess: false ??????', async () => {
        accountRepository.findOne.mockResolvedValue(undefined);

        const result = await authService.kakaoUserInfos(adminKakaoDto);

        expect(result).toEqual({ loginSuccess: false });
      });

      it('?????? ?????? ?????? ??? ????????? ????????? ?????? 500 ?????? ??????', async () => {
        accountRepository.findOne.mockRejectedValue(findAccount);

        try {
          const result = await authService.kakaoUserInfos(adminKakaoDto);
          expect(result).toBeDefined();
        } catch (err) {
          expect(err.status).toBe(500);
          expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
        }
      });
    });

    describe('naverUserInfos', () => {
      const adminNaverDto = {
        nickname: '??????',
        name: '??????',
        age: '20',
        birth: '20220909',
        phone: '010-8592-8520',
        snsId: 'naver',
        snsType: '00',
        snsToken: '',
        gender: '0',
        accessToken: '',
      };

      const findAccount = {
        name: '??????',
        email: 'admin@naver.com',
        phone: '010-8592-8520',
        nickname: '??????',
        birth: '20220909',
        snsId: 'naver',
        snsType: '01',
        snsToken: '',
        gender: '0',
        division: true,
      };

      it('?????? ????????? ?????? ?????? loginSuccess: true ??????', async () => {
        accountRepository.findOne.mockResolvedValue(findAccount);

        const result = await authService.naverUserInfos(adminNaverDto);

        expect(result).toEqual({ loginSuccess: true });
      });

      it('?????? ????????? ?????? ?????? loginSuccess: false ??????', async () => {
        accountRepository.findOne.mockResolvedValue(undefined);

        const result = await authService.naverUserInfos(adminNaverDto);

        expect(result).toEqual({ loginSuccess: false });
      });

      it('?????? ?????? ?????? ??? ????????? ????????? ?????? 500 ?????? ??????', async () => {
        accountRepository.findOne.mockRejectedValue(findAccount);

        try {
          const result = await authService.naverUserInfos(adminNaverDto);
          expect(result).toBeDefined();
        } catch (err) {
          expect(err.status).toBe(500);
          expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
        }
      });
    });

    describe('googleUserInfos', () => {
      const adminGoogleDto = {
        name: '??????',
        email: 'google@email.com',
        birth: '20220909',
        snsId: 'google',
        snsType: '02',
        snsToken: '',
        gender: '0',
        accessToken: '',
      };

      const findAccount = {
        name: '??????',
        email: 'google@email.com',
        phone: '010-8592-8520',
        nickname: '??????',
        birth: '20220909',
        snsId: 'google',
        snsType: '02',
        snsToken: '',
        gender: '0',
        division: true,
      };

      it('?????? ????????? ?????? ?????? loginSuccess: true ??????', async () => {
        accountRepository.findOne.mockResolvedValue(findAccount);

        const result = await authService.googleUserInfos(adminGoogleDto);

        expect(result).toEqual({ loginSuccess: true });
      });

      it('?????? ????????? ?????? ?????? loginSuccess: false ??????', async () => {
        accountRepository.findOne.mockResolvedValue(undefined);

        const result = await authService.googleUserInfos(adminGoogleDto);

        expect(result).toEqual({ loginSuccess: false });
      });

      it('?????? ?????? ?????? ??? ????????? ????????? ?????? 500 ?????? ??????', async () => {
        accountRepository.findOne.mockRejectedValue(findAccount);

        try {
          const result = await authService.googleUserInfos(adminGoogleDto);
          expect(result).toBeDefined();
        } catch (err) {
          expect(err.status).toBe(500);
          expect(err.response).toBe('????????? ?????????????????????. ??????????????? ??????????????????.');
        }
      });
    });
  });
});

import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from 'src/modules/account/entities/account';
import { Repository } from 'typeorm';
import { SignInUserDto } from './dto/signin-user.dto';
import { SignInAdminDto } from './dto/signin-admin.dto';
import { ConfigService } from '@nestjs/config';
import { JwtManageService } from 'src/guard/jwt/jwt-manage.service';
import { FindIdDto } from './dto/findid.dto';
import { UserKakaoDto } from './dto/user.kakao.dto';
import { UserNaverDto } from './dto/user.naver.dto';
import { UserGoogleDto } from './dto/user.google.dto';

/**
 * Auth 관련 토큰, 검증, 카카오 서비스
 */
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,

    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private readonly configService: ConfigService,
    private readonly jwtManageService: JwtManageService,
  ) {}

  /**
   * account(id) 조회하는 메소드
   * @param id
   * @returns
   */
  public async find(id: string): Promise<Account | undefined> {
    return this.accountRepository.findOne({ where: { id } });
  }

  /**
   * id 조회하는 메소드
   * @param id : DB에 조회시 입력한 id
   * @returns : DB에 조회한 id
   */
  async getById(id: string) {
    const account = await this.accountRepository.findOneBy({
      id: id,
    });

    return account;
  }

  /**
   * 회원가입의 유무를 검증하는 메소드
   * @param id
   * @param plainTextPassword
   * @returns : 검증후 결과를 리턴
   */
  public async validate(id: string, plainTextPassword: string): Promise<any> {
    try {
      const account = await this.getById(id);
      await this.verifyPassword(plainTextPassword, account.password);
      const { password, ...result } = account;
      return result;
    } catch (error) {
      throw new HttpException('잘못된 인증 정보입니다.', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * 비밀번호 체크하는 메소드
   * @param plainTextPassword
   * @param hashedPassword
   */
  private async verifyPassword(plainTextPassword: string, hashedPassword: string) {
    const isPasswordMatching = await bcrypt.compare(plainTextPassword, hashedPassword);

    if (!isPasswordMatching) {
      throw new HttpException('잘못된 인증 정보12입니다.', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * 아이디를 조회하는 메소드
   * @param id
   * @param showCurrentHashedRefreshToken
   * @returns : 조회한 아이디를 리턴
   */
  async getByAccountId(id: string, snsType: string, showCurrentHashedRefreshToken: boolean) {
    const account = await this.accountRepository.findOne({ where: { id, snsType } });

    if (account) {
      delete account.password;
      if (!showCurrentHashedRefreshToken) {
        delete account.currentHashedRefreshToken;
      }

      return account;
    }
  }

  //snsType 을  포함한 getBySnsType 생성
  /**
   * snsType을 조회하는 메소드
   * @param snsType
   * @param showCurrentHashedRefreshToken
   * @returns : 조회한 snsType을 리턴
   */
  async getBySnsType(snsType: string, snsId: string, showCurrentHashedRefreshToken: boolean) {
    const account = await this.accountRepository.findOne({ where: { snsType, snsId } });

    if (account) {
      delete account.password;
      if (!showCurrentHashedRefreshToken) {
        delete account.currentHashedRefreshToken;
      }

      return account;
    }
  }

  /**
   * 리프레쉬 토큰이 유효한지 검증하는 메소드
   * @param refreshToken
   * @param id
   * @returns : 검증 후 결과값을 리턴
   */
  async getAccountRefreshTokenMatches(
    refreshToken: string,
    id: string,
  ): Promise<{ result: boolean }> {
    const account = await this.accountRepository.findOne({ where: { id } });

    if (!account) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    const isRefreshTokenMatching = await compare(refreshToken, account.currentHashedRefreshToken);

    if (isRefreshTokenMatching) {
      return { result: true };
    } else {
      throw new UnauthorizedException('여기에서 접근에러입니다.');
    }
  }

  /**
   * 일반 로그인 시 리프레쉬 토큰을 생성하는 메소드
   * @param refreshToken
   * @param id
   */
  async setCurrentRefreshToken(refreshToken: string, id: string) {
    if (refreshToken) {
      refreshToken = await bcrypt.hash(refreshToken, 10);
    }
    await this.accountRepository.update({ id }, { currentHashedRefreshToken: refreshToken });
  }

  /**
   * 카카오 로그인 시 리프레쉬 토큰을 생성하는 메소드
   * @param refreshToken
   * @param id
   */
  async setSocialCurrentRefreshToken(refreshToken: string, snsId: string) {
    if (refreshToken) {
      refreshToken = await bcrypt.hash(refreshToken, 10);
    }
    await this.accountRepository.update({ snsId }, { currentHashedRefreshToken: refreshToken });
  }

  async setSocialToken(snsToken: string, snsId: string) {
    if (snsToken) {
      snsToken = await bcrypt.hash(snsToken, 10);
    }
    await this.accountRepository.update({ snsId }, { snsToken: snsToken });
  }

  /**
   * AccessToken 을 발급하는 메소드
   * @param id
   * @param snsType
   * @returns : 토큰과 토큰 옵션을 리턴
   */
  public getCookieWithJwtAccessToken(id: string, snsType: string) {
    const payload = { id, snsType };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
    });

    // 토큰과 토큰옵션을 리턴
    return {
      accessToken: token,
      accessOption: {
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        maxAge: Number(this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')) * 1000,
      },
    };
  }

  /**
   * 카카오 로그인 시 AccessToken 을 발급하는 메소드
   * @param id
   * @param snsType
   * @returns : 토큰과 토큰 옵션을 리턴
   */
  public socialGetCookieWithJwtAccessToken(snsId: string, snsType: string) {
    const payload = { snsId, snsType };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
    });

    // 토큰과 토큰옵션을 리턴
    return {
      accessToken: token,
      accessOption: {
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        maxAge: Number(this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')) * 1000,
      },
    };
  }

  /**
   * 리프레쉬토큰을 발급하는 메소드
   * @param id
   * @param snsType
   * @returns : 리프레쉬 토큰과 리프레쉬 토큰 옵션을 리턴
   */
  public getCookieWithJwtRefreshToken(id: string, snsType: string) {
    const payload = { id, snsType };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME')}s`,
    });

    //Refresh 토큰과 옵션을 리턴
    return {
      refreshToken: token,
      refreshOption: {
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        maxAge: Number(this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME')) * 1000,
      },
    };
  }

  /**
   * 카카오 리프레쉬토큰을 발급하는 메소드
   * @param id
   * @param snsType
   * @returns : 카카오 리프레쉬 토큰과 카카오 리프레쉬 토큰 옵션을 리턴
   */
  public socialGetCookieWithJwtRefreshToken(snsId: string, snsType: string) {
    const payload = { snsId, snsType };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME')}s`,
    });

    //Refresh 토큰과 옵션을 리턴
    return {
      refreshToken: token,
      refreshOption: {
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        maxAge: Number(this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME')) * 1000,
      },
    };
  }

  /**
   *  관리자 로그인 메소드
   * @param param0
   * @returns : 토큰과 관리자 정보를 리턴
   */
  async loginAdmin({ id, password }: SignInAdminDto) {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new UnauthorizedException('존재하지 않는 관리자입니다.');
    }
    const match = await bcrypt.compare(password, account.password);
    if (!match) {
      throw new UnauthorizedException('비밀번호가 틀립니다. 다시 시도해주세요.');
    }

    //division 값 확인 후 관리자만 로그인 가능
    if (account.division === false) {
      throw new UnauthorizedException('로그인 정보를 확인해주세요.');
    }
    const { accessToken, accessOption } = await this.getCookieWithJwtAccessToken(id, null);

    const { refreshToken, refreshOption } = await this.getCookieWithJwtRefreshToken(id, null);
    await this.setCurrentRefreshToken(refreshToken, id);

    // const lastLoginDate = new Date(account.loginDate).getTime() / 1000;

    // console.log('최근 로그인 일시', lastLoginDate);
    const returnAdmin = await this.accountRepository
      .createQueryBuilder('account')
      .select([
        'account.accountId',
        'account.id',
        'account.password',
        'account.name',
        'account.email',
        'account.phone',
        'account.nickname',
        'account.birth',
        'account.gender',
        'account.currentHashedRefreshToken',
        'account.ci',
        'account.snsId',
        'account.snsType',
        'account.snsToken',
        'account.regDate',
        'account.updateDate',
        'account.delDate',
        'account.loginDate',
        'account.division',
      ])
      .where('account.id = :id', { id })
      .getOne();
    return {
      accessToken,
      accessOption,
      refreshToken,
      refreshOption,
      account: returnAdmin,
    };
  }

  /**
   *  사용자 로그인 메소드
   * @param param0
   * @returns : 토큰과 관리자 정보를 리턴
   */
  async loginUser({ id, password }: SignInUserDto) {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }
    const match = await bcrypt.compare(password, account.password);
    if (!match) {
      throw new UnauthorizedException('비밀번호가 틀립니다. 다시 시도해주세요.');
    }

    //division 값 확인 후 사용자만 로그인 가능
    if (account.division === true) {
      throw new UnauthorizedException('로그인 정보를 확인해주세요.');
    }
    const { accessToken, accessOption } = await this.getCookieWithJwtAccessToken(id, null);

    const { refreshToken, refreshOption } = await this.getCookieWithJwtRefreshToken(id, null);
    await this.setCurrentRefreshToken(refreshToken, id);

    const returnUser = await this.accountRepository
      .createQueryBuilder('account')
      .select([
        'account.accountId',
        'account.id',
        'account.password',
        'account.name',
        'account.email',
        'account.phone',
        'account.nickname',
        'account.birth',
        'account.gender',
        'account.currentHashedRefreshToken',
        'account.ci',
        'account.snsId',
        'account.snsType',
        'account.snsToken',
        'account.regDate',
        'account.updateDate',
        'account.delDate',
        'account.loginDate',
        'account.division',
      ])
      .where('account.id = :id', { id })
      .getOne();
    return {
      accessToken,
      accessOption,
      refreshToken,
      refreshOption,
      account: returnUser,
    };
  }

  public getCookiesForLogOut() {
    return {
      accessOption: {
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        maxAge: 0,
      },
      refreshOption: {
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        maxAge: 0,
      },
    };
  }

  // TODO: 리프레쉬토큰 갱신
  // jwt refresh token 갱신이 필요한지 확인하여 갱신 처리 후
  // * 신규 발급받은 token 정보 가져오기
  public async refreshTokenChange(id: string, payload: TokenPayload, refreshToken: string) {
    if (this.jwtManageService.isNeedRefreshTokenChange(refreshToken)) {
      const newRefreshToken = this.jwtManageService.getCookieWithJwtRefreshToken(payload);
      await this.setCurrentRefreshToken(id, newRefreshToken.refreshToken);

      return newRefreshToken;
    }
  }

  /**
   * 아이디 찾기 메소드
   * @param param0
   * @returns : DB에서 조회한 아이디 값을 리턴
   */
  async findId({ name, phone }: FindIdDto) {
    console.log('아이디 찾기 테스트', name);
    console.log('아이디 찾기 테스트', phone);

    const id = await this.accountRepository.findOne({ where: { name, phone } });
    if (!id) {
      throw new UnauthorizedException('입력한 정보에 대한 일치하는 아이디가 없습니다.');
    }
    const returnId = await this.accountRepository
      .createQueryBuilder('account')
      .select('account.id')
      .where('account.name = :name', { name })
      .where('account.phone = :phone', { phone })
      .getOne();

    return returnId;
  }

  /**
   * 리프레쉬 토큰 삭제 메소드
   * @param accountId
   * @returns accountId 값으로 해당 사용자의 리프래쉬 토큰을 null처리
   */
  async removeRefreshToken(accountId: number) {
    return this.accountRepository.update({ accountId }, { currentHashedRefreshToken: null });
  }

  /**
   * 카카오 유저정보 확인 후 FE에 결과값 알려주는 메소드
   * @param userKakaoDto
   * @returns : DB에서 snsId 조회 후 결과 값을 리턴
   */
  async kakaoUserInfos(userKakaoDto: UserKakaoDto) {
    const snsId = userKakaoDto.snsId;
    const user = await this.accountRepository.findOne({ where: { snsId } });

    if (user) {
      const loginDto = {
        loginSuccess: true,
      };
      // loginSuccess (true) 값을 리턴
      return loginDto;
    } else {
      const sencondDataDto = {
        loginSuccess: false,
      };
      // loginSuccess (false) 값을 리턴
      return sencondDataDto;
    }
  }

  /**
   * 네이버 유저정보 확인 후 FE에 결과값 알려주는 메소드
   * @param userNaverDto
   * @returns : DB에서 snsId 조회 후 결과 값을 리턴
   */
  async naverUserInfos(userNaverDto: UserNaverDto) {
    const snsId = userNaverDto.snsId;
    const user = await this.accountRepository.findOne({ where: { snsId } });

    if (user) {
      const loginDto = {
        loginSuccess: true,
      };
      // loginSuccess (true) 값을 리턴
      return loginDto;
    } else {
      const sencondDataDto = {
        loginSuccess: false,
      };
      // loginSuccess (false) 값을 리턴
      return sencondDataDto;
    }
  }

  /**
   * 구글 유저정보 확인 후 FE에 결과값 알려주는 메소드
   * @param userGoogleDto
   * @returns : DB에서 snsId 조회 후 결과 값을 리턴
   */
  async googleUserInfos(userGoogleDto: UserGoogleDto) {
    const snsId = userGoogleDto.snsId;
    const user = await this.accountRepository.findOne({ where: { snsId } });

    if (user) {
      const loginDto = {
        loginSuccess: true,
      };
      // loginSuccess (true) 값을 리턴
      return loginDto;
    } else {
      const sencondDataDto = {
        loginSuccess: false,
      };
      // loginSuccess (false) 값을 리턴
      return sencondDataDto;
    }
  }
}
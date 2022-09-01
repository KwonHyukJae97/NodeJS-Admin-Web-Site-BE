import {Injectable} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {ExtractJwt, Strategy} from "passport-jwt";
import {ConfigService} from "@nestjs/config";
import {AccountService} from "../../modules/account/account.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly accountService: AccountService,
    ) {
        super({
            // jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request) => {
                    return request?.cookies?.authorization;
                },
            ]),
            secretOrKey: configService.get('JWT_ACCESS_TOKEN_SECRET'),
            ignoreExpiration: false,
        });
    }

    async validate(payload: TokenPayload) {
        return await this.accountService.getByAccountId(payload.accountId, false);
    }
}
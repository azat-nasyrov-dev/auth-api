import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from '@auth/dto';
import { AuthService } from '@auth/auth.service';
import { Tokens } from '@auth/types/tokens.interface';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Cookie, Public, UserAgent } from '@common/decorators';
import { UserResponse } from '@user/responses';
import { GoogleAuthGuard } from '@auth/guards/google-auth.guard';
import { HttpService } from '@nestjs/axios';
import { map, mergeMap } from 'rxjs';
import { handleTimeoutAndError } from '@common/helpers';
import { YandexAuthGuard } from '@auth/guards/yandex-auth.guard';
import { Provider } from '@prisma/client';

const REFRESH_TOKEN = 'refreshtoken';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('register')
  public async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);

    if (!user) {
      throw new BadRequestException(
        `Не получается зарегистрировать пользователя с данными ${JSON.stringify(dto)}`,
      );
    }

    return new UserResponse(user);
  }

  @Post('login')
  @HttpCode(200)
  public async login(@Body() dto: LoginDto, @Res() res: Response, @UserAgent() agent: string) {
    const tokens = await this.authService.login(dto, agent);

    if (!tokens) {
      throw new BadRequestException(`Не получается войти с данными ${JSON.stringify(dto)}`);
    }

    this.setRefreshTokenToCookies(tokens, res);
  }

  @Get('logout')
  public async logout(@Cookie(REFRESH_TOKEN) refreshToken: string, @Res() res: Response) {
    if (!refreshToken) {
      res.sendStatus(HttpStatus.OK);
      return;
    }

    await this.authService.deleteRefreshToken(refreshToken);
    res.cookie(REFRESH_TOKEN, '', { httpOnly: true, secure: true, expires: new Date() });
    res.sendStatus(HttpStatus.OK);
  }

  @Get('refresh-tokens')
  public async refreshTokens(
    @Cookie(REFRESH_TOKEN) refreshToken: string,
    @Res() res: Response,
    @UserAgent() agent: string,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    const tokens = await this.authService.refreshTokens(refreshToken, agent);

    if (!tokens) {
      throw new UnauthorizedException();
    }

    this.setRefreshTokenToCookies(tokens, res);
  }

  private setRefreshTokenToCookies(tokens: Tokens, res: Response) {
    if (!tokens) {
      throw new UnauthorizedException();
    }

    res.cookie(REFRESH_TOKEN, tokens.refreshToken.token, {
      httpOnly: true,
      sameSite: 'lax',
      expires: new Date(tokens.refreshToken.exp),
      secure: this.configService.get('NODE_ENV', 'development') === 'production',
      path: '/',
    });
    res.status(HttpStatus.OK).json({ accessToken: tokens.accessToken });
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  public googleAuth() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  public googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const token = req.user['accessToken'];
    return res.redirect(`https://localhost:3000/api/auth/success-google?token=${token}`);
  }

  @Get('success-google')
  public successGoogle(
    @Query('token') token: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    return this.httpService
      .get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`)
      .pipe(
        mergeMap(({ data: { email } }) =>
          this.authService.providerAuth(email, agent, Provider.GOOGLE),
        ),
        map((data) => this.setRefreshTokenToCookies(data, res)),
        handleTimeoutAndError(),
      );
  }

  @UseGuards(YandexAuthGuard)
  @Get('yandex')
  public yandexAuth() {}

  @UseGuards(YandexAuthGuard)
  @Get('yandex/callback')
  public yandexAuthCallback(@Req() req: Request, @Res() res: Response) {
    const token = req.user['accessToken'];
    return res.redirect(`https://localhost:3000/api/auth/success-yandex?token=${token}`);
  }

  @Get('success-yandex')
  public successYandex(
    @Query('token') token: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    return this.httpService
      .get(`https://login.yandex.ru/info?format=json&oauth_token=${token}`)
      .pipe(
        mergeMap(({ data: { default_email } }) =>
          this.authService.providerAuth(default_email, agent, Provider.YANDEX),
        ),
        map((data) => this.setRefreshTokenToCookies(data, res)),
        handleTimeoutAndError(),
      );
  }
}

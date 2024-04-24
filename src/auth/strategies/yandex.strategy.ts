import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-yandex';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get('YANDEX_APP_ID'),
      clientSecret: configService.get('YANDEX_APP_SECRET'),
      callbackURL: 'http://localhost:3000/api/auth/yandex/callback',
    });
  }

  public async validate(
    accessToken: string,
    refreshToken: string,
    profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { id, displayName, emails, photos } = profile;
    const user = {
      id,
      displayName,
      email: emails[0].value,
      picture: photos[0].value,
      accessToken,
    };

    done(null, user);
  }
}

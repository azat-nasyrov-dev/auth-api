import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { GoogleStrategy } from '@auth/strategies/google.strategy';
import { YandexStrategy } from '@auth/strategies/yandex.strategy';

export const STRATEGIES = [JwtStrategy, GoogleStrategy, YandexStrategy];

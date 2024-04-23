import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { GoogleStrategy } from '@auth/strategies/google.strategy';

export const STRATEGIES = [JwtStrategy, GoogleStrategy];

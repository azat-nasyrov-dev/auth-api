import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { GoogleAuthGuard } from '@auth/guards/google-auth.guard';

export const GUARDS = [JwtAuthGuard, RolesGuard, GoogleAuthGuard];

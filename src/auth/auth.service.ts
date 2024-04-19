import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UserService } from '@user/user.service';
import { LoginDto, RegisterDto } from '@auth/dto';
import { Tokens } from '@auth/types/tokens.interface';
import { compareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Token, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { v4 } from 'uuid';
import { add } from 'date-fns';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  public async register(dto: RegisterDto) {
    const user: User = await this.userService.findOne(dto.email).catch((err) => {
      this.logger.error(err);
      return null;
    });

    if (user) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    return this.userService.createUser(dto).catch((err) => {
      this.logger.error(err);
      return null;
    });
  }

  public async login(dto: LoginDto, agent: string): Promise<Tokens> {
    const user: User = await this.userService.findOne(dto.email, true).catch((err) => {
      this.logger.error(err);
      return null;
    });

    if (!user || !compareSync(dto.password, user.password)) {
      throw new UnauthorizedException('Не верный логин или пароль');
    }

    return this.generateTokens(user, agent);
  }

  private async generateTokens(user: User, agent: string): Promise<Tokens> {
    const accessToken =
      'Bearer ' +
      this.jwtService.sign({
        id: user.id,
        email: user.email,
        roles: user.roles,
      });

    const refreshToken = await this.getRefreshToken(user.id, agent);
    return { accessToken, refreshToken };
  }

  public async refreshTokens(refreshToken: string, agent: string): Promise<Tokens> {
    const token = await this.prismaService.token.findUnique({ where: { token: refreshToken } });

    if (!token) {
      throw new UnauthorizedException();
    }

    await this.prismaService.token.delete({ where: { token: refreshToken } });

    if (new Date(token.exp) < new Date()) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOne(token.userId);
    return this.generateTokens(user, agent);
  }

  private async getRefreshToken(userId: string, agent: string): Promise<Token> {
    const _token = await this.prismaService.token.findFirst({
      where: {
        userId,
        userAgent: agent,
      },
    });

    const token = _token?.token ?? '';

    return this.prismaService.token.upsert({
      where: { token },
      update: {
        token: v4(),
        exp: add(new Date(), { months: 1 }),
      },
      create: {
        token: v4(),
        exp: add(new Date(), { months: 1 }),
        userId,
        userAgent: agent,
      },
    });
  }

  public deleteRefreshToken(token: string) {
    return this.prismaService.token.delete({ where: { token } });
  }
}

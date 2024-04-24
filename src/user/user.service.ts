import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt';
import { JwtPayload } from '@auth/types/jwt.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { convertToSecondsUtil } from '@common/utils';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  public async createUser(user: Partial<User>) {
    const hashedPassword = user?.password ? this.hashPassword(user.password) : null;

    const createdUser = await this.prismaService.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        password: hashedPassword ?? undefined,
        provider: user?.provider ?? undefined,
        roles: user?.roles ?? undefined,
        isBlocked: user?.isBlocked ?? undefined,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        provider: user?.provider,
        roles: ['USER'],
      },
    });

    await this.cacheManager.set(createdUser.id, createdUser);
    await this.cacheManager.set(createdUser.email, createdUser);

    return createdUser;
  }

  public async findOne(idOrEmail: string, isReset = false): Promise<User> {
    if (isReset) {
      await this.cacheManager.del(idOrEmail);
    }

    const user = await this.cacheManager.get<User>(idOrEmail);

    if (!user) {
      const user = await this.prismaService.user.findFirst({
        where: {
          OR: [{ id: idOrEmail }, { email: idOrEmail }],
        },
      });

      if (!user) {
        return null;
      }

      await this.cacheManager.set(
        idOrEmail,
        user,
        convertToSecondsUtil(this.configService.get('JWT_EXP')),
      );
      return user;
    }

    return user;
  }

  public async deleteById(id: string, user: JwtPayload) {
    if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException();
    }

    await Promise.all([this.cacheManager.del(id), this.cacheManager.del(user.email)]);
    return this.prismaService.user.delete({ where: { id }, select: { id: true } });
  }

  private hashPassword(password: string) {
    return hashSync(password, genSaltSync(10));
  }
}

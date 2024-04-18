import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt';
import { JwtPayload } from '@auth/types/jwt.interface';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  public createUser(user: Partial<User>) {
    const hashedPassword = this.hashPassword(user.password);

    return this.prismaService.user.create({
      data: {
        email: user.email,
        password: hashedPassword,
        roles: ['USER'],
      },
    });
  }

  public findOne(idOrEmail: string) {
    return this.prismaService.user.findFirst({
      where: {
        OR: [{ id: idOrEmail }, { email: idOrEmail }],
      },
    });
  }

  public deleteById(id: string, user: JwtPayload) {
    if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException();
    }

    return this.prismaService.user.delete({ where: { id }, select: { id: true } });
  }

  private hashPassword(password: string) {
    return hashSync(password, genSaltSync(10));
  }
}

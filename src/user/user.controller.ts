import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from '@user/user.service';
import { UserResponse } from '@user/responses';
import { CurrentUser, Roles } from '@common/decorators';
import { JwtPayload } from '@auth/types/jwt.interface';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Role, User } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':idOrEmail')
  public async findOne(@Param('idOrEmail') idOrEmail: string) {
    const user = await this.userService.findOne(idOrEmail);
    return new UserResponse(user);
  }

  @Delete(':id')
  public async deleteById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.userService.deleteById(id, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  public me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Put()
  public async updateUser(@Body() body: Partial<User>) {
    const user = await this.userService.createUser(body);
    return new UserResponse(user);
  }
}

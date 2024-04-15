import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { UserService } from '@user/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  public createUser(@Body() dto) {
    return this.userService.createUser(dto);
  }

  @Get(':idOrEmail')
  public findOne(@Param('idOrEmail') idOrEmail: string) {
    return this.userService.findOne(idOrEmail);
  }

  @Delete(':id')
  public deleteById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.deleteById(id);
  }
}

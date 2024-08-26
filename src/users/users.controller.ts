/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { Body, Controller, Inject, Post, Request } from '@nestjs/common';
import {
  AuthenticateAdmin,
  ChangePasswordDto,
  CreateAdmin,
  UpdateAdmin,
} from './user.dto';
import { UsersService } from './users.service';
import { Request as request } from 'express';

@Controller('users')
export class UsersController {
  constructor(@Inject('USER-SERVICE') private _users: UsersService) {}

  @Post('admin/create')
  createAdmin(@Body() body: CreateAdmin, @Request() req: request) {
    return this._users.createAdmin(body, req);
  }

  @Post('admin/authenticate')
  authenticateAdmin(@Body() body: AuthenticateAdmin, @Request() req: request) {
    return this._users.AuthenticateAdmin(body, req);
  }

  @Post('admin/update')
  updateAdmin(@Body() body: UpdateAdmin, @Request() req: request) {
    return this._users.updateAdmin(body, req);
  }

  @Post('change-password')
  ChangePassword(@Body() body: ChangePasswordDto, @Request() req: request) {
    return this._users.changePassword(body, req);
  }
}

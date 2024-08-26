/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-empty-function */
import { Body, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AuthenticateAdmin,
  ChangePasswordDto,
  CreateAdmin,
  SerializeAdmin,
  UpdateAdmin,
} from './user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/entities/users.entity';
import { Repository } from 'typeorm';
import { ResponseService } from '../shared/services/response.service';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { JwtService } from '../shared/services/jwt.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly _userRepo: Repository<Users>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('JWT-SERVICE') private jwt: JwtService,
  ) {}

  async createAdmin(body: CreateAdmin, req: Request) {
    try {
      const { email, username, password, firtsname, lastname, role } = body;

      // check admin is already created through this email or username
      const isCreatedByemailOrUsername: Users[] = await this._userRepo
        .createQueryBuilder('Users')
        .where('username = :username OR email = :email', { email, username })
        .execute();

      // return back is user exsist
      if (isCreatedByemailOrUsername.length) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Admin is already created by this email or username',
          [],
          req,
        );
      }

      // hashing password
      const salt: string = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const payload: Users | any = {
        email: email,
        username: username,
        lastname: lastname,
        password: hash,
        role: role,
        firstname: firtsname,
      };

      // insert admin in DB
      const createAdmin = this._userRepo.create(payload);
      await this._userRepo.save(createAdmin);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Admin is created successfully!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async AuthenticateAdmin(@Body() body: AuthenticateAdmin, req: Request) {
    try {
      const { username, password } = body;

      const FindAdminByEmailOrUsername: Users = await this._userRepo
        .createQueryBuilder('Users')
        .where('username = :username OR email = :username', { username })
        .getOne();

      if (!FindAdminByEmailOrUsername) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid Username or email!',
          [],
          req,
        );
      }

      const { password: Hashpassword } = FindAdminByEmailOrUsername;

      const isValidPassword = await bcrypt.compare(password, Hashpassword);

      if (!isValidPassword) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Please enter valid password !',
          [],
          req,
        );
      }

      const serializeAdmin = new SerializeAdmin(FindAdminByEmailOrUsername);
      const {
        email,
        username: name,
        firstname,
        lastname,
        role,
        id,
      } = serializeAdmin;

      const payload = {
        id: id,
        email: email,
        username: name,
        firstname,
        lastname,
        role,
      };
      const token = this.jwt.createAuthToken(payload);

      const updateAdmin = await this._userRepo
        .createQueryBuilder('Users')
        .update()
        .set({
          auth_token: token,
        })
        .where('username = :username OR email = :username', { username })
        .execute();

      if (!updateAdmin.affected)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'user not able to authenticate, internal server issues',
          [],
          req,
        );

      serializeAdmin.auth_token = token;

      return this.res.generateResponse(
        HttpStatus.OK,
        'admin is authenticate successfully !',
        serializeAdmin,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updateAdmin(body: UpdateAdmin, req: Request) {
    try {
      const { id, email, username, password, firstname, lastname, role } = body;

      const findAdminById = await this._userRepo
        .createQueryBuilder('Users')
        .where('id = :id', { id })
        .getOne();

      if (!findAdminById) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid User Id',
          [],
          req,
        );
      }

      // check admin is already created through this email or username
      const isCreatedByemailOrUsername: Users[] = await this._userRepo
        .createQueryBuilder('Users')
        .where('(username = :username OR email = :email) AND id != :id', {
          email,
          username,
          id,
        })
        .execute();

      // return back is user exsist
      if (isCreatedByemailOrUsername.length) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'some one is already this username or email',
          [],
          req,
        );
      }

      // hashing password
      const salt: string = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      // update auth token
      const payload = {
        username: username,
        email: email,
        password: hash,
        firstname: firstname,
        lastname: lastname,
        role: role,
      };
      const token = this.jwt.createAuthToken(payload);

      const updateAdmin = await this._userRepo
        .createQueryBuilder('Users')
        .update()
        .set({
          username: username,
          email: email,
          password: hash,
          firstname: firstname,
          lastname: lastname,
          role: role,
          auth_token: token,
        })
        .where('id = :id', { id })
        .execute();

      if (!updateAdmin.affected) {
        throw new Error('admin not able to update, internal server issues');
      }

      const updatedAdmin = await this._userRepo
        .createQueryBuilder('Users')
        .where('id = :id', { id })
        .getOne();
      return this.res.generateResponse(
        HttpStatus.OK,
        'User updated successfully',
        new SerializeAdmin(updatedAdmin),
        req,
      );
    } catch (error) {
      console.log(error);
      return this.res.generateError(error, req);
    }
  }

  //         SM dashboard change password functionaility

  async changePassword(body: ChangePasswordDto, req: Request) {
    try {
      const { username, current_password, new_password, confirm_password } =
        body;

      // Check User is valide or not

      const isValidEmailorUsername = await this._userRepo
        .createQueryBuilder('Wl_Account')
        .where('username = :username OR email = :email', {
          username,
          email: username,
        })
        .getOne();

      //    if not valide return error message

      if (!isValidEmailorUsername)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid Email or Username',
          null,
          req,
        );

      const { password: hashPassword } = isValidEmailorUsername;

      // check password is valid or not
      const isValidPassword = await bcrypt.compare(
        current_password,
        hashPassword,
      );

      //    if not valide return error message

      if (!isValidPassword)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'please enter a valid password',
          null,
          req,
        );

      // if new password and current password is not matched return error message

      if (new_password != confirm_password)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'New password and Confirm Password does not match',
          null,
          req,
        );

      /// Hash new password

      const salt = await bcrypt.genSalt(10);
      const HashedPassword = await bcrypt.hash(new_password, salt);

      // check current password and new password is same return error
      if (current_password == new_password)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Current Password and New Password can not be same',
          [],
          req,
        );

      // Update new password is Database
      const UpdatePassword = await this._userRepo
        .createQueryBuilder('Wl_Account')
        .update()
        .set({
          password: HashedPassword,
        })
        .where('username = :username OR email = :username', { username })
        .execute();

      // if password not update return error message
      if (!UpdatePassword.affected)
        throw new Error(
          'user not able to authenticate, internal server issues',
        );

      /// Return success message
      return this.res.generateResponse(
        HttpStatus.OK,
        'Password Changed Successfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

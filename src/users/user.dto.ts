/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable prettier/prettier */
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateAdmin {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  firtsname: string;

  @IsNotEmpty()
  lastname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  role: string;
}

export class UpdateAdmin {
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  firstname: string;

  @IsNotEmpty()
  lastname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  role: string;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  current_password: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  new_password: string;

  @IsNotEmpty()
  confirm_password: string;
}

export class AuthenticateAdmin {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}

export class SerializeAdmin {
  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  id: number;

  @Expose()
  role: string;

  @Expose()
  firstname: string;

  @Expose()
  lastname: string;

  @Expose()
  auth_token: string;

  @Exclude()
  password: string;

  constructor(partial: Partial<SerializeAdmin>) {
    return plainToClass(SerializeAdmin, partial, {
      excludeExtraneousValues: true,
    });
  }
}

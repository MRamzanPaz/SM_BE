/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable prettier/prettier */
import { Expose, plainToClass } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsStrongPassword,
  Min,
  MinLength,
} from 'class-validator';

export class createWlAccount {
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsNotEmpty()
  contact_no: string;
}

export class AuthenticateWlDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}

export class SerializeWlAcc {
  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  id: number;

  @Expose()
  wallet_balance: number;

  constructor(partial: Partial<SerializeWlAcc>) {
    return plainToClass(SerializeWlAcc, partial, {
      excludeExtraneousValues: true,
    });
  }
}

export class UpdateWlAccount {
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  // @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  contact_no: string;
}

export class AssignPlanDto {
  @IsNotEmpty()
  // @IsNumber()
  plan_id: any[];

  @IsNotEmpty()
  @IsNumber()
  wl_id: number;

  @IsNotEmpty()
  @IsNumber()
  price_mode: number;

  setUnAssign: boolean;
}

export class UnAssignPlanDto {
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;

  @IsNotEmpty()
  @IsNumber()
  wl_id: number;
}

export class TransactionDto {
  @IsNotEmpty()
  @IsNumber()
  wl_id: number;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}

export class TopupAccountDto {
  @IsNotEmpty()
  cardNumber: string;

  @IsNotEmpty()
  month: string;

  @IsNotEmpty()
  year: string;

  @IsNotEmpty()
  cvv: string;

  @IsNotEmpty()
  amount: string;
}

export class PurchasePlanDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  wl_id: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  plan_id: number;
}

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsNumber()
  wl_id: number;

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;
}

export class FilterDto {
  @IsNotEmpty()
  whitelabel_id: string;

  start_date: Date;

  end_date: Date;

  filter_type: string;

  @IsNotEmpty()
  balanceCalculation: boolean;
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

export class OtpDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  otp: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  new_password: string;
}

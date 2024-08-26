import { Type } from 'class-transformer';
import { IsNotEmpty, Min } from 'class-validator';

export class RechargeWalletDto {
  // @IsNotEmpty()
  // cardNumber: string;

  // @IsNotEmpty()
  // month: string;

  // @IsNotEmpty()
  // year: string;

  // @IsNotEmpty()
  // cvv: string;

  @IsNotEmpty()
  stripe_token: string;

  @IsNotEmpty()
  amount: string;
}

export class PaginationDto {
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  page: number;

  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  pageSize: number;

  searchStr: string;

  start_date: Date;

  end_date: Date;
}

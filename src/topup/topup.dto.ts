import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class topupDto {
  @IsNotEmpty()
  iccid: string;

  @IsNotEmpty()
  @IsNumber()
  plan_id: number;
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
}

export class RechargeDto {
  @IsNotEmpty()
  iccid: string;

  @IsNotEmpty()
  iso3: string;
}

export class AdminRechargeableCountryDto {
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  wl_id: number;

  @IsNotEmpty()
  iccid: string;
}

export class AdminPackageListDto {
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  wl_id: number;

  @IsNotEmpty()
  iccid: string;

  @IsNotEmpty()
  iso3: string;
}

export class ApplyPakacgeDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  wl_id: number;

  @IsNotEmpty()
  iccid: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  plan_id: number;
}

import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlanDto {
  @IsNotEmpty()
  plan_name: string;

  global_plan: Boolean;

  region: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(2)
  plan_type: number;

  countries: number[];

  data: string;

  validity: string;

  @IsNotEmpty()
  vendor: number;

  @IsNotEmpty()
  package_name: string;

  @IsNotEmpty()
  retail_price: string;

  @IsNotEmpty()
  wholesale_price: string;

  @IsNotEmpty()
  platinum_price: string;

  @IsNotEmpty()
  cost_price: string;

  singleUse: Boolean;

  test_plan: Boolean;

  isRegional: Boolean;

  recharge_only: Boolean;

  msisdn: string;

  voicemail_system: string;

  state: string;

  rate_center: string;

  description: string;
}

export class UpadtePlanDto {
  @IsNotEmpty()
  plan_id: number;

  @IsNotEmpty()
  plan_name: string;

  @IsNotEmpty()
  @IsBoolean()
  global_plan: Boolean;

  region: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(2)
  plan_type: number;

  @IsArray()
  @ArrayMinSize(1)
  countries: number[];

  @IsNotEmpty()
  data: string;

  @IsNotEmpty()
  validity: string;

  @IsNotEmpty()
  vendor: number;

  @IsNotEmpty()
  package_name: string;

  @IsNotEmpty()
  retail_price: string;

  @IsNotEmpty()
  wholesale_price: string;

  @IsNotEmpty()
  platinum_price: string;

  @IsNotEmpty()
  cost_price: string;

  @IsBoolean()
  @IsNotEmpty()
  singleUse: Boolean;

  @IsNotEmpty()
  @IsBoolean()
  test_plan: Boolean;

  @IsNotEmpty()
  @IsBoolean()
  isRegional: Boolean;
  description:string;
  @IsNotEmpty()
  @IsBoolean()
  recharge_only: Boolean;
}

export class DeletePlanDto {
  @IsNotEmpty()
  plan_id: number;
}

export class DeleteMultiplePlanDto {
  @IsArray()
  @ArrayMinSize(1)
  plan_ids: number[];
}

export class PaginationDto {
  searchStr: string;

  @IsNotEmpty()
  pagesize: string;

  @IsNotEmpty()
  page: string;
}

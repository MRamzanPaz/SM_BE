import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

class Plan {
  @IsNotEmpty()
  plan_name: string;

  @IsNotEmpty()
  region: string;

  @IsNotEmpty()
  iccid: string;

  @IsNotEmpty()
  qr_code: string;

  @IsNotEmpty()
  data: string;

  @IsNotEmpty()
  validity: string;

  @IsNotEmpty()
  price: string;

  @IsNotEmpty()
  country: string;
}

class ServiceNetwork {
  @IsNotEmpty()
  serving_mcc_mnc: string;
}

class ImsiApn {
  @IsNotEmpty()
  imsi_apn: string;
}

class RateGroup {
  @IsNotEmpty()
  @IsNumber()
  rate_group_allowance: number;

  @IsNotEmpty()
  rate_group_allow_qtyp: string;
}
export class AddInventoryDto {
  @IsNotEmpty()
  @IsNumber()
  vendor_id: number;

  @IsNotEmpty()
  iccid: string;

  @IsNotEmpty()
  package_name: string;

  @IsNotEmpty()
  qr_code: string;

  data_roaming: string;

  apn: string;

  @IsNotEmpty()
  @IsNumber()
  cost_price: number;
}
export class PaginationDto {
  searchStr: string;

  @IsNotEmpty()
  pagesize: string;

  @IsNotEmpty()
  page: string;
}

export class UpdatePackageDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  id: number;

  @IsNotEmpty()
  @IsNumber()
  vendor_id: number;

  @IsNotEmpty()
  iccid: string;

  @IsNotEmpty()
  package_name: string;

  @IsNotEmpty()
  qr_code: string;

  data_roaming: string;

  apn: string;

  @IsNotEmpty()
  @IsNumber()
  cost_price: number;

  msisdn: string;

  voicemail_system: string;

  state: string;

  rate_center: string;
}

export class AddChoicePlanDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  dft_buff_alloc_size: number;

  @IsNotEmpty()
  @IsNumber()
  rate_group_allow_days: number;

  @IsNotEmpty()
  @IsNumber()
  rate_group_occurrences: number;

  @IsNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceNetwork)
  serving_networks: ServiceNetwork[];

  @IsNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImsiApn)
  imsi_apns: ImsiApn[];

  @IsNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RateGroup)
  rate_groups: RateGroup[];

  @IsNotEmpty()
  @IsNumber()
  vendor_id: number;
}

export class UpdateChoicePlanDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  id: number;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  dft_buff_alloc_size: number;

  @IsNotEmpty()
  @IsNumber()
  rate_group_allow_days: number;

  @IsNotEmpty()
  @IsNumber()
  rate_group_occurrences: number;

  @IsNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceNetwork)
  serving_networks: ServiceNetwork[];

  @IsNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImsiApn)
  imsi_apns: ImsiApn[];

  @IsNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RateGroup)
  rate_groups: RateGroup[];

  @IsNotEmpty()
  @IsNumber()
  vendor_id: number;
}

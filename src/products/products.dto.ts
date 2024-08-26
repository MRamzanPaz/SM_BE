import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class PaginationDto {
  @IsNotEmpty()
  pageSize: string;

  @IsNotEmpty()
  page: string;

  searchStr: string;
}

export class RequestOrderDto {
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;
  email: string;
}

export class CancleOrderDto {
  @IsNotEmpty()
  // @IsNumber()
  order_id: string;

  reason: string;
}

export class CompleteOrderDto {
  @IsNotEmpty()
  // @IsNumber()
  order_id: string;

  email: string;
}

export class ActivateEsimDto {
  @IsNotEmpty()
  iccid: string;
}

export class FilterOrderList {
  searchStr: string;

  @Type(() => Number)
  @Min(0)
  orderType: string;

  @Type(() => Number)
  @Min(0)
  wlId: string;

  start_date: Date;
  end_date: Date;
}

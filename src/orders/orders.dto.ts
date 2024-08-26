import { Type } from 'class-transformer';
import { IsNotEmpty, Min } from 'class-validator';

export class PaginationDto {
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  page: string;

  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  pageSize: string;

  searchStr: string;

  @Type(() => Number)
  @Min(0)
  filter: string;
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

export class StatusByOrderLstDto {
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  vendor_id: string;

  @IsNotEmpty()
  status: string;
}

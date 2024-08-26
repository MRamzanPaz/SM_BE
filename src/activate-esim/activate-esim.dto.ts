import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AvtivateEsimDto {
  @IsNotEmpty()
  @IsNumber()
  wl_id: number;

  @IsNotEmpty()
  iccid: string;
}

export class UpdateActivatedEsimDto {
  @IsNotEmpty()
  @IsNumber()
  wl_id: number;

  @IsNotEmpty()
  iccid: string;

  @IsNotEmpty()
  @IsNumber()
  id: number;
}

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
}

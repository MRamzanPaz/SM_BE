import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AddDeviceDto {
  @IsNotEmpty()
  model: string;

  @IsNotEmpty()
  os: string;

  @IsNotEmpty()
  brand: string;

  @IsNotEmpty()
  name: string;
}

export class UpdateDeviceDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  id: number;

  @IsNotEmpty()
  model: string;

  @IsNotEmpty()
  os: string;

  @IsNotEmpty()
  brand: string;

  @IsNotEmpty()
  name: string;
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

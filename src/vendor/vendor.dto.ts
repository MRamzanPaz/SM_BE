import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateVendorDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  inventory_type: number;
}

export class UpdateVendorDto {
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  inventory_type: number;
}

export class DeleteVendorDto {
  @IsNotEmpty()
  id: number;
}

export class PaginationDto {
  searchStr: string;

  @IsNotEmpty()
  pagesize: string;

  @IsNotEmpty()
  page: string;
}

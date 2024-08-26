import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class AddRegionDto {
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  countries: number[];
}

export class CountriesWiseDto {
  @IsNotEmpty()
  region_id: string;
}

export class UpdateRegion {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  countries: number[];
}

export class DeleteRegionDto {
  @IsNotEmpty()
  @IsNumber()
  region_id: number;
}

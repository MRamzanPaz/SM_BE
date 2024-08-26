import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

class eSimGoBundleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  initialQuantity: number;

  @IsNotEmpty()
  remainingQuantity: number;

  @IsNotEmpty()
  startTime: string;

  @IsNotEmpty()
  endTime: string;
}

export class WebHookEsimGoDto {
  @IsNotEmpty()
  @IsString()
  iccid: string;

  @IsNotEmpty()
  @IsString()
  alertType: string;

  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => eSimGoBundleDto)
  bundle: eSimGoBundleDto;
}

export class shopifyDto {
  @IsNotEmpty()
  @IsString()
  action: string;

  @IsNotEmpty()
  data: any;
}

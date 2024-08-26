import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class PartnerRequestDto {
  @IsNotEmpty()
  order_no: string;
}

export class AdminAcceptDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  request_id: number;
}

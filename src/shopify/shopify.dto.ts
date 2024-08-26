import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class GenerateUrlDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  wl_id: number;
}

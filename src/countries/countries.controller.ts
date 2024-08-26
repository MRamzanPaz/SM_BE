import { Controller, Get, Inject, Post, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { CountriesService } from './countries.service';

@Controller('countries')
export class CountriesController {
  constructor(@Inject('COUNTRY-SERVICE') private _country: CountriesService) {}

  @Get('get/all')
  getAllCountries(@Request() req: request) {
    return this._country.getAllCountries(req);
  }

  @Post('add')
  addAllCountries(@Request() req: request) {
    return this._country.addAllCountries(req);
  }
}

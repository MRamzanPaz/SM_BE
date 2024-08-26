import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import {
  AddRegionDto,
  CountriesWiseDto,
  DeleteRegionDto,
  UpdateRegion,
} from './region.dto';
import { RegionService } from './region.service';
import { Request as request } from 'express';

@Controller('region')
export class RegionController {
  constructor(
    @Inject('REGION-SERVICE')
    private _regions: RegionService,
  ) {}

  @Post('add')
  addRegion(@Body() body: AddRegionDto, @Request() req: request) {
    return this._regions.addRegion(body, req);
  }

  @Get('get/all')
  getAllRegions(@Request() req: request) {
    return this._regions.getAllRegionList(req);
  }

  @Get('countries')
  getCountriesRegionWise(
    @Query() params: CountriesWiseDto,
    @Request() req: request,
  ) {
    return this._regions.getCountriesRegionWise(params, req);
  }

  @Get('countries/:region_name')
  getAllCountriesByRegionName(
    @Param('region_name') region_name: string,
    @Request() req: request,
  ) {
    return this._regions.getCountriesByRegionName(region_name, req);
  }

  @Post('update')
  updateRegion(@Body() body: UpdateRegion, @Request() req: request) {
    return this._regions.updateRegion(body, req);
  }

  @Post('delete')
  deleteRegion(@Body() body: DeleteRegionDto, @Request() req: request) {
    return this._regions.deleteRegion(body, req);
  }
}

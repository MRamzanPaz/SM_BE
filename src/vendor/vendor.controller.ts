/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-empty-function */
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { Request as request } from 'express';
import {
  CreateVendorDto,
  DeleteVendorDto,
  PaginationDto,
  UpdateVendorDto,
} from './vendor.dto';
import { VendorService } from './vendor.service';

@Controller('vendor')
export class VendorController {
  constructor(@Inject('VENDOR-SERVICE') private _vendors: VendorService) {}

  @Post('create')
  createVendor(@Body() body: CreateVendorDto, @Request() req: request) {
    return this._vendors.createVendor(body, req);
  }

  @Post('update')
  updateVendor(@Body() body: UpdateVendorDto, @Request() req: request) {
    return this._vendors.updateVendor(body, req);
  }

  @Post('delete')
  deleteVendor(@Body() body: DeleteVendorDto, @Request() req: request) {
    return this._vendors.deleteVendor(body, req);
  }

  @Get('get/all')
  getAllVendor(@Request() req: request) {
    return this._vendors.getAllVendors(req);
  }

  @Get('get/all/pagination')
  getAllVendorWithPagination(
    @Query() params: PaginationDto,
    @Request() req: request,
  ) {
    return this._vendors.getAllVendorsWithPagination(params, req);
  }

  @Get('report')
  getAllVendorsOrderReport(@Request() req: request) {
    return this._vendors.getAllVendorsOrderReport(req);
  }
}

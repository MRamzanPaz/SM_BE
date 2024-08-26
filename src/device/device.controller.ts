import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { Request as request } from 'express';
import { AddDeviceDto, PaginationDto, UpdateDeviceDto } from './device.dto';

@Controller('device')
export class DeviceController {
  constructor(@Inject('DEVICE-SERVICE') private _device: DeviceService) {}

  @Post('')
  addDevives(@Body() body: AddDeviceDto, @Request() req: request) {
    return this._device.addDevives(body, req);
  }

  @Get('')
  getAllDevices(@Request() req: request) {
    return this._device.getAllDevices(req);
  }

  @Get('pagination')
  getAllDeviceWithPagination(
    @Query() query: PaginationDto,
    @Request() req: request,
  ) {
    return this._device.getAllDeviceWithPagination(query, req);
  }

  @Put('')
  updateDevice(@Body() body: UpdateDeviceDto, @Request() req: request) {
    return this._device.updateDevice(body, req);
  }

  @Post('setup')
  setupAirAloDevices(@Request() req: request) {
    return this._device.setupAirAloDevices(req);
  }

  @Delete(':id')
  deleteDevice(@Param('id') id: string, @Request() req: request) {
    return this._device.deleteDevice(id, req);
  }

  @Get('list')
  getDeviceListForWL(@Request() req: request) {
    return this._device.getDeviceListForWL(req);
  }

  @Get('list/:id')
  getDeviceByIdForWL(@Param('id') id: string, @Request() req: request) {
    return this._device.getDeviceByIdForWL(id, req);
  }

  @Get('os/:os')
  getDeviceByOSForWL(@Param('os') os: string, @Request() req: request) {
    return this._device.getDeviceByOSForWL(os, req);
  }
}

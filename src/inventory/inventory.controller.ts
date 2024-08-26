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
import { Request as request } from 'express';
import {
  AddChoicePlanDto,
  AddInventoryDto,
  PaginationDto,
  UpdateChoicePlanDto,
  UpdatePackageDto,
} from './inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject('INVENTORY-SERVICE')
    private _inventory: InventoryService,
  ) {}

  // SM-INVENTORy-START
  @Post('add')
  addInventory(@Body() body: AddInventoryDto, @Request() req: request) {
    return this._inventory.addInventoryList(body, req);
  }

  @Put('update')
  updatePackage(@Body() body: UpdatePackageDto, @Request() req: request) {
    return this._inventory.updatePackage(body, req);
  }

  @Delete(':id')
  deleteInventory(@Param('id') id: string, @Request() req: request) {
    return this._inventory.deleteInventory(id, req);
  }

  @Get('all')
  getAllPackages(@Request() req: request) {
    return this._inventory.getAllPackages(req);
  }

  @Get('packages/all/:vendor_id')
  getAllPackagesByVendor(
    @Param('vendor_id') vendor_id: string,
    @Request() req: request,
  ) {
    return this._inventory.getAllPackagesByVendor(vendor_id, req);
  }

  // SM-INVENTORy-END

  // CHOICE-VENDOR-INVENTORU-START

  @Post('add/choice/plan')
  addChoiceVendorPlan(@Body() body: AddChoicePlanDto, @Request() req: request) {
    return this._inventory.addChoiceVendorPlan(body, req);
  }

  @Put('update/choice/plan')
  updateChoiceVendorPlan(
    @Body() body: UpdateChoicePlanDto,
    @Request() req: request,
  ) {
    return this._inventory.updateChoiceVendorPlan(body, req);
  }

  @Get('choice/plan/list')
  getAllChoicePlanList(@Request() req: request) {
    return this._inventory.getAllChoicePlanList(req);
  }

  @Delete('delete/choice/plan/:id')
  deleteChoicePlanId(@Param('id') id: string, @Request() req: request) {
    return this._inventory.deleteChoicePlanId(id, req);
  }

  // CHOICE-VENDOR-INVENTORU-END
}

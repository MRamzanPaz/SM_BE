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
  AdminPackageListDto,
  AdminRechargeableCountryDto,
  ApplyPakacgeDto,
  PaginationDto,
  RechargeDto,
  topupDto,
} from './topup.dto';
import { TopupService } from './topup.service';

@Controller('topup')
export class TopupController {
  constructor(@Inject('TOPUP-SERVICE') private _topup: TopupService) {}

  // ===================================== WHITELABEL-ROUTES =========================================================

  @Get()
  getAllTopupOrders(@Request() req: request) {
    return this._topup.getAllTopupOrders(req);
  }

  @Post('pagination')
  getAllTopupOrdersWithPagination(
    @Query() query: PaginationDto,
    @Body() body: any,
    @Request() req: request,
  ) {
    return this._topup.getAllTopupOrdersWithPagination(query, body, req);
  }

  @Get('rechargeable/esim-list')
  getAllRechargeableEsims(@Request() req: request) {
    return this._topup.getAllRechargeableEsims(req);
  }

  @Get('country_list/:iccid')
  getAllCountryListByIccid(
    @Param('iccid') iccid: string,
    @Request() req: request,
  ) {
    return this._topup.getAllCountryListByIccid(iccid, req);
  }

  @Get('rechargeable/packages/country_iccid')
  getAllPackagesListByIccidAndCountry(
    @Query() query: RechargeDto,
    @Request() req: request,
  ) {
    return this._topup.getAllPackagesListByIccidAndCountry(query, req);
  }

  @Get('packages/:iccid')
  getAllTopupPackages(@Param('iccid') iccid: string, @Request() req: request) {
    return this._topup.getAllTopupPackages(iccid, req);
  }
  @Post('apply')
  applyTopUp(@Body() body: topupDto, @Request() req: request) {
    return this._topup.applyToptup(body, req);
  }

  // ===================================== WHITELABEL-ROUTES =========================================================
  // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // ===================================== ADMIN-ROUTES =========================================================

  @Get('admin/rechargeable/esim-list/:wl_id')
  getAllRechargeAbleEsimListByWhitelabel(
    @Param('wl_id') wl_id: string,
    @Request() req: request,
  ) {
    return this._topup.getAllRechargeAbleEsimListByWhitelabel(wl_id, req);
  }

  @Get('admin/country_list')
  getAllRechargeCountryListForAdmin(
    @Query() query: AdminRechargeableCountryDto,
    @Request() req: request,
  ) {
    return this._topup.getAllRechargeCountryListForAdmin(query, req);
  }

  @Get('admin/packageList')
  getAllTopupPackageListForAdmin(
    @Query() query: AdminPackageListDto,
    @Request() req: request,
  ) {
    return this._topup.getAllTopupPackageListForAdmin(query, req);
  }

  @Get('admin/list')
  getAllTopupOrderListForAdmin(@Request() req: request) {
    return this._topup.getAllTopupOrderListForAdmin(req);
  }

  @Get('admin/list/pagination')
  getAllTopupOrderListForAdminByPagination(
    @Query() query: PaginationDto,
    @Request() req: request,
  ) {
    return this._topup.getAllTopupOrderListForAdminByPagination(query, req);
  }

  @Post('admin/apply')
  applyPackage(@Body() body: ApplyPakacgeDto, @Request() req: request) {
    return this._topup.applyPackage(body, req);
  }

  @Post('admin/adjust')
  adjustopupOrder(@Body() body: any, @Request() req: request) {
    return this._topup.adjustopupOrder(body, req);
  }

  @Post('admin/adjustTopupStatus')
  adjustopupOrderStatus(@Body() body: any, @Request() req: request) {
    return this._topup.adjustopupOrderStatus(body, req);
  }

  // ===================================== ADMIN-ROUTES =========================================================
}

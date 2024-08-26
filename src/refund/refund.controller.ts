import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { RefundActivities } from 'src/entities/refundActivity.entity';
import { RefundService } from './refund.service';
import { AdminAcceptDto, PartnerRequestDto } from './refund.dto';
import { Request as request } from 'express';

@Controller('refund')
export class RefundController {
  constructor(
    @Inject('REFUND-SERVICE')
    private _refunds: RefundService,
  ) {}

  @Post('partner/request')
  RequestRefundByPartner(
    @Body() body: PartnerRequestDto,
    @Request() req: request,
  ) {
    return this._refunds.RequestRefundByPartner(body, req);
  }

  @Put('partner/cancel/:id')
  CancelRefundByPartner(@Param('id') id: string, @Request() req: request) {
    return this._refunds.CancelRefundByPartner(id, req);
  }

  @Get('partner/get/all')
  getAllPartnerWiseRequest(@Request() req: request) {
    return this._refunds.getAllPartnerWiseRequest(req);
  }

  @Get('partner/check/:order_id')
  checkRefundStatus(
    @Param('order_id') order_id: string,
    @Request() req: request,
  ) {
    return this._refunds.checkRefundStatus(order_id, req);
  }

  @Post('admin/accept')
  acceptRefundReqByAdmin(
    @Body() body: AdminAcceptDto,
    @Request() req: request,
  ) {
    return this._refunds.acceptRefundReqByAdmin(body, req);
  }

  @Post('admin/reject')
  rejectRefundReqByAdmin(
    @Body() body: AdminAcceptDto,
    @Request() req: request,
  ) {
    return this._refunds.rejectRefundReqByAdmin(body, req);
  }

  @Get('admin/get/all')
  getAllAdminWiseRequest(@Request() req: request) {
    return this._refunds.getAllAdminWiseRequest(req);
  }
}

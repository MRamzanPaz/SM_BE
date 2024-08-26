import { Controller, Get, Inject, Param, Query, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { OrdersService } from './orders.service';
import {
  FilterOrderList,
  PaginationDto,
  StatusByOrderLstDto,
} from './orders.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDERS-SERVICE')
    private _orders: OrdersService,
  ) {}

  @Get()
  getAlleSimOrders(@Request() req: request) {
    return this._orders.getAlleSimOrders(req);
  }

  @Get('status')
  getAllOrdersByStatus(
    @Query() query: StatusByOrderLstDto,
    @Request() req: request,
  ) {
    return this._orders.getAllOrdersByStatus(query, req);
  }

  @Get('allCombineOrders')
  getAllOrders(@Query() query: FilterOrderList, @Request() req: request) {
    return this._orders.getAllOrders(query, req);
  }

  @Get('orderDetails/:orderId')
  getOrderDetails(@Param('orderId') orderId: string, @Request() req: request) {
    return this._orders.getOrderDetails(orderId, req);
  }

  @Get('pagination')
  getAllOrdersByPagination(
    @Query() query: PaginationDto,
    @Request() req: request,
  ) {
    return this._orders.getAllOrdersByPagination(query, req);
  }

  @Get('sendEmail/:id')
  sendOrderEmail(@Param('id') id: string, @Request() req: request) {
    return this._orders.reSendEmail(id, req);
  }
}

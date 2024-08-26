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
import { RbPlansService } from './products.service';
import {
  ActivateEsimDto,
  CancleOrderDto,
  CompleteOrderDto,
  FilterOrderList,
  PaginationDto,
  RequestOrderDto,
} from './products.dto';

@Controller('products')
export class ProductsController {
  constructor(@Inject('PLAN-SERVICE') private _rbplans: RbPlansService) {}

  @Post('pagination')
  getAllProductWithPagination(
    @Query() params: PaginationDto,
    @Body() body: any,
    @Request() req: request,
  ) {
    return this._rbplans.getAllEsimPLan(params, body, req);
  }

  @Get('all')
  getAllProducts(@Request() req: request) {
    return this._rbplans.getAllProduct(req);
  }

  @Post('orders/request')
  requestProductOrder(@Body() body: RequestOrderDto, @Request() req: request) {
    return this._rbplans.requestOrder(body, req);
  }

  @Post('orders/cancel')
  cancelProductOrder(@Body() body: CancleOrderDto, @Request() req: request) {
    return this._rbplans.cancelOrder(body, req);
  }

  @Post('orders/complete')
  completeProductOrder(
    @Body() body: CompleteOrderDto,
    @Request() req: request,
  ) {
    return this._rbplans.completeOrder(body, req);
  }

  @Get('esim/validate/:iccid')
  getAllProductCountries(
    @Param('iccid') iccid: string,
    @Request() req: request,
  ) {
    return this._rbplans.validateEsim(iccid, req);
  }

  @Post('esim/activate')
  activateIccid(@Body() body: ActivateEsimDto, @Request() req: request) {
    return this._rbplans.ativateEsim(body, req);
  }
  @Get('orders')
  getAllOrders(@Query() query: FilterOrderList, @Request() req: request) {
    return this._rbplans.getAllOrders(query, req);
  }

  @Get('orderDetails/:orderId')
  getOrderDetails(@Param('orderId') orderId: string, @Request() req: request) {
    return this._rbplans.getOrderDetails(orderId, req);
  }

  @Post('orders/pagination')
  getAllOrdersByPagination(
    @Query() query: PaginationDto,
    @Body() body: any,
    @Request() req: request,
  ) {
    return this._rbplans.getAllOrdersByPagination(query, body, req);
  }

  @Get('orders/:order_id')
  getAllOrdersById(
    @Param('order_id') order_id: string,
    @Request() req: request,
  ) {
    return this._rbplans.getAllOrdersById(order_id, req);
  }

  @Get(':id')
  getProductionByID(@Param('id') id: string, @Request() req: request) {
    return this._rbplans.getProductById(id, req);
  }
}

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { Request as request } from 'express';
import { GenerateUrlDto } from './shopify.dto';

@Controller('shopify')
export class ShopifyController {
  constructor(@Inject('SHOPIFY-SERVICE') private shopify: ShopifyService) {}

  @Post()
  generateShopifyUrl(@Body() body: GenerateUrlDto, @Request() req: request) {
    return this.shopify.generateShopifyUrl(body, req);
  }

  @Get()
  getAllWebhooks(@Request() req: request) {
    return this.shopify.getAllWebhooks(req);
  }

  @Get('orders/:order_id')
  getOrderByShopifyId(
    @Param('order_id') order_id: string,
    @Request() req: request,
  ) {
    return this.shopify.getOrderByShopifyId(order_id, req);
  }
}

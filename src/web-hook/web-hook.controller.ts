import {
  Controller,
  Inject,
  Post,
  Body,
  Request,
  Param,
  Get,
} from '@nestjs/common';
import { WebHookService } from './web-hook.service';
import { WebHookEsimGoDto, shopifyDto } from './web-hook.dto';
import { Request as request } from 'express';

@Controller('web-hook')
export class WebHookController {
  constructor(@Inject('WEBHOOK-SERVICE') private _webHooks: WebHookService) {}

  @Post('eSIMGo')
  sendEsimNotification(
    @Body() body: WebHookEsimGoDto,
    @Request() req: request,
  ) {
    return this._webHooks.sendEsimNotification(body, req);
  }

  @Post('redtea')
  sendRedTeaNotification(@Body() body: any, @Request() req: request) {
    console.log(body);
    console.log(req);
    return this._webHooks.sendRedTeaNotification(body, req);
  }

  @Get('redtea')
  sendRedTeaNotification1(@Request() req: request) {
    console.log('GET METHOD');
    console.log(req);
    return 'ok';
  }

  @Post('shopify/:access_id')
  shopifyWebHookAction(
    @Param('access_id') access_id: string,
    @Body() body: any,
    @Request() req: request,
  ) {
    return this._webHooks.shopifyWebHookAction(access_id, body, req);
  }
}

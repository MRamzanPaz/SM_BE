import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { AppService } from './app.service';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): any {
    return this.appService.getHello();
  }

  @Get('images/:image')
  public async getQrImage(@Param('image') img: string) {
    const file = createReadStream(join(__dirname, '..', `qr-codes/${img}`));
    return new StreamableFile(file);
  }
}

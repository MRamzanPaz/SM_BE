import { Body, Controller, Get, Inject, Post, Request } from '@nestjs/common';
import { ReportService } from './report.service';
import { Request as request } from 'express';
import { GPRDto } from './report.dto';

@Controller('report')
export class ReportController {
  constructor(@Inject('REPORT-SERVICE') private _report: ReportService) {}

  @Post('gpr')
  generateGrossProfitReport(@Body() body: GPRDto, @Request() req: request) {
    return this._report.generateGrossProfitReport(body, req);
  }

  @Post('gpr/setup')
  setupGrossProfitReport(@Request() req: request) {
    return this._report.setupGrossProfitReport(req);
  }
}

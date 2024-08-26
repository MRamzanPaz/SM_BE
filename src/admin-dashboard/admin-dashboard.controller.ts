import { Controller, Get, Inject, Param, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(
    @Inject('ADMIN-SERVICE')
    private _dashboard: AdminDashboardService,
  ) {}

  @Get('esims')
  getAllwhitelabelEsimList(@Request() req: request) {
    return this._dashboard.getAllwhitelabelEsimList(req);
  }

  @Get('esims/details/:iccid')
  getEsimDetails(@Param('iccid') iccid: string, @Request() req: request) {
    return this._dashboard.getEsimDetails(iccid, req);
  }

  @Get('graph/plan')
  getPlanGraph(@Request() req: request) {
    return this._dashboard.getPlanGraph(req);
  }

  @Get('graph/gb')
  getPlanGraphGbWise(@Request() req: request) {
    return this._dashboard.getPlanGraphGbWise(req);
  }

  @Get('plan/statics')
  getAllPlansStatic(@Request() req: request) {
    return this._dashboard.getAllPlansStatic(req);
  }
}

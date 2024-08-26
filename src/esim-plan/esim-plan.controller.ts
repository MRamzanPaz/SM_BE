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
  CreatePlanDto,
  DeleteMultiplePlanDto,
  DeletePlanDto,
  PaginationDto,
  UpadtePlanDto,
} from './esim-plan.dto';
import { EsimPlanService } from './esim-plan.service';

@Controller('esim-plan')
export class EsimPlanController {
  constructor(
    @Inject('ESIM-SERVICE')
    private _plan: EsimPlanService,
  ) {}

  @Post('create')
  createEsimPlan(@Body() body: CreatePlanDto, @Request() req: request) {
    return this._plan.createPlan(body, req);
  }

  @Put('update')
  updateEsimPlan(@Body() body: UpadtePlanDto, @Request() req: request) {
    return this._plan.updatePlan(body, req);
  }

  @Delete('delete/all')
  deleteAll(@Body() body: DeleteMultiplePlanDto, @Request() req: request) {
    return this._plan.deleteAll(body, req);
  }

  @Delete('delete/:id')
  deleteEsimPlan(@Param('id') id: string, @Request() req: request) {
    return this._plan.deletePlan(id, req);
  }

  @Get('all')
  getAllEsimPlans(@Request() req: request) {
    return this._plan.getAllplan(req);
  }

  @Get('all/pagination')
  getAllWithPagination(
    @Query() params: PaginationDto,
    @Request() req: request,
  ) {
    return this._plan.getAllPlanWithPagination(params, req);
  }

  @Get('upload')
  uplaodAllPlans(@Request() req: request) {
    return this._plan.uploadPlansFromSheet(req);
  }

  @Get(':id')
  getEsimPLanById(@Param('id') id: string, @Request() req: request) {
    return this._plan.getEsimByPLanID(id, req);
  }
}

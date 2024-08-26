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
import { ActivateEsimService } from './activate-esim.service';
import { Request as request } from 'express';
import {
  AvtivateEsimDto,
  PaginationDto,
  UpdateActivatedEsimDto,
} from './activate-esim.dto';

@Controller('activate-esim')
export class ActivateEsimController {
  constructor(
    @Inject('ACTIVATE-ESIM-SERVICE') private _activateEsim: ActivateEsimService,
  ) {}

  @Post('')
  activateEsim(@Body() body: AvtivateEsimDto, @Request() req: request) {
    return this._activateEsim.activateEsim(body, req);
  }

  @Put('')
  updateActivatedEsim(
    @Body() body: UpdateActivatedEsimDto,
    @Request() req: request,
  ) {
    return this._activateEsim.updateActivatedEsim(body, req);
  }

  @Get('')
  getAllActivatedEsimList(@Request() req: request) {
    return this._activateEsim.getAllActivatedEsimList(req);
  }

  @Get('pagination')
  getAllActivatedEsimByPagination(
    @Query() query: PaginationDto,
    @Request() req: request,
  ) {
    return this._activateEsim.getAllActivatedEsimByPagination(query, req);
  }

  @Delete(':id')
  deletedActivatedEsim(@Param('id') id: string, @Request() req: request) {
    return this._activateEsim.deletedActivatedEsim(id, req);
  }
}

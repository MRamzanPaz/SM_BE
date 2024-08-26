/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Request,
} from '@nestjs/common';
import {
  createWlAccount,
  AuthenticateWlDto,
  UpdateWlAccount,
  AssignPlanDto,
  UnAssignPlanDto,
  TransactionDto,
  TopupAccountDto,
  PurchasePlanDto,
  UpdateStatusDto,
  FilterDto,
  ChangePasswordDto,
  OtpDto,
} from './wl-account.dto';
import { Request as request } from 'express';
import { WlAccountService } from './wl-account.service';
import { Any } from 'typeorm';

@Controller('wl-account')
export class WlAccountController {
  constructor(@Inject('WL-SERVICE') private _wl: WlAccountService) {}

  @Post('create')
  createAccount(@Body() body: createWlAccount, @Request() req: request) {
    return this._wl.createWlAccount(body, req);
  }

  @Get('all')
  getAllWlAccount(@Request() req: request) {
    return this._wl.getAllWlAccount(req);
  }

  @Post('authenticate')
  AuthenticateAccount(
    @Body() body: AuthenticateWlDto,
    @Request() req: request,
  ) {
    return this._wl.authenticateWlAccount(body, req);
  }

  @Post('update')
  updateAccount(@Body() body: UpdateWlAccount, @Request() req: request) {
    return this._wl.updateWlAccount(body, req);
  }

  @Delete(':id')
  deletedWlAccount(@Param('id') id: string, @Request() req: request) {
    return this._wl.deletedWlAccount(id, req);
  }

  @Post('update/status')
  updateStatus(@Body() body: UpdateStatusDto, @Request() req: request) {
    return this._wl.updateStatus(body, req);
  }

  @Post('plan/assign')
  assignPlanToWL(@Body() body: AssignPlanDto, @Request() req: request) {
    return this._wl.assignPlanToWl(body, req);
  }

  @Post('plan/unassign')
  unassignPlanToWL(@Body() body: UnAssignPlanDto, @Request() req: request) {
    return this._wl.unassignPlanToWl(body, req);
  }

  @Post('plan/purchase')
  purchasePlanForWl(@Body() body: PurchasePlanDto, @Request() req: request) {
    return this._wl.purchasePlanForWl(body, req);
  }

  @Get('plan/wl/:id')
  getAllWLAssignPlan(@Param('id') id: string, @Request() req: request) {
    return this._wl.getAllWLAssignPlan(id, req);
  }

  @Get('order/plan/wl/:id')
  getAllWLAssignPlanForEsimOrder(
    @Param('id') id: string,
    @Request() req: request,
  ) {
    return this._wl.getAllWLAssignPlanForEsimOrder(id, req);
  }

  @Post('transaction/credit')
  addBalance(@Body() body: TransactionDto, @Request() req: request) {
    return this._wl.addBalance(body, req);
  }
  @Post('transaction/debit')
  deductBalance(@Body() body: TransactionDto, @Request() req: request) {
    return this._wl.DeductBalance(body, req);
  }

  @Post('topup')
  addBalanceWithCreditCard(
    @Body() body: TopupAccountDto,
    @Request() req: request,
  ) {
    return body;
  }

  @Get('transaction')
  getAlltransactions(@Request() req: request) {
    return this._wl.getAllTransactions(req);
  }

  @Get('transaction/reset')
  resetTransaction(@Request() req: request) {
    return this._wl.resetTransaction(req);
  }

  @Get('transaction/filter')
  getAllTransactionByFilter(
    @Query() query: FilterDto,
    @Request() req: request,
  ) {
    return this._wl.getAllTransactionByFilter(query, req);
  }

  @Get('transaction/whitelabel/:id')
  getAlltransactionsByWlId(@Param('id') id: string, @Request() req: request) {
    return this._wl.getAllTransactionByWlId(id, req);
  }

  @Get('transaction/:id')
  getSpecificTransactionDetails(
    @Param('id') id: string,
    @Request() req: request,
  ) {
    return this._wl.getSpecificTransactionDetails(id, req);
  }

  @Get('all/unassignPlans/:wl_id')
  getAllUnassignPlans(@Param('wl_id') wl_id: string, @Request() req: request) {
    return this._wl.getAllUnassignPlans(wl_id, req);
  }

  @Get('all/wholesaleAssignPlans/:wl_id')
  getAllWholeSaleAssignPlans(
    @Param('wl_id') wl_id: string,
    @Request() req: request,
  ) {
    return this._wl.getAllWholeSaleAssignPlans(wl_id, req);
  }

  @Get('all/retailAssignPlans/:wl_id')
  getAllRetailAssignPlans(
    @Param('wl_id') wl_id: string,
    @Request() req: request,
  ) {
    return this._wl.getAllRetailAssignPlans(wl_id, req);
  }

  @Get('all/platinumAssignPlans/:wl_id')
  getAllPlatinumAssignPlans(
    @Param('wl_id') wl_id: string,
    @Request() req: request,
  ) {
    return this._wl.getAllPlatinumAssignPlans(wl_id, req);
  }

  @Post('set/planPricing')
  setSelectedPlansToWholeSalePrice(
    @Body() body: AssignPlanDto,
    @Request() req: request,
  ) {
    return this._wl.setSelectedPlansToWholeSalePrice(body, req);
  }

  @Post('change-password')
  ChangePassword(@Body() body: ChangePasswordDto, @Request() req: request) {
    return this._wl.changePassword(body, req);
  }

  @Get('forgot-passsword/:username')
  GenerateOtp(@Param('username') username: string, @Request() req: request) {
    return this._wl.GenerateOtp(username, req);
  }

  @Post('verifyotp-updatepassword')
  verifyOtpAndUpdatePassword(@Body() body: OtpDto, @Request() req, request) {
    return this._wl.VerifyOtp(body, req);
  }
}

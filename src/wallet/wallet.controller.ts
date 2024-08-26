import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Request as request } from 'express';
import { PaginationDto, RechargeWalletDto } from './wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(@Inject('WALLET-SERVICE') private _wallet: WalletService) {}

  @Get('')
  getWalletAmount(@Request() req: request) {
    return this._wallet.getWalletBalance(req);
  }

  @Post('recharge')
  rechargeWallet(@Body() body: RechargeWalletDto, @Request() req: request) {
    return this._wallet.rechargeWallet(body, req);
  }

  @Get('transactions')
  getAllWalletTransactions(@Request() req: request) {
    return this._wallet.getAllWalletTransactions(req);
  }

  @Get('transactions/pagination')
  getAllWalletTransactionsPagination(
    @Query() query: PaginationDto,
    @Body() body: any,
    @Request() req: request,
  ) {
    return this._wallet.getAllWalletTransactionsPagination(query, body, req);
  }
}

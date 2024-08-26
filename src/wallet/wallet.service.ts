import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { GeneralService } from 'src/shared/services/general.service';
import { JwtService } from 'src/shared/services/jwt.service';
import { ResponseService } from 'src/shared/services/response.service';
import { Between, In, IsNull, Like, Repository } from 'typeorm';
import { PaginationDto, RechargeWalletDto } from './wallet.dto';
import { StripeService } from 'src/shared/services/stripe.service';
import convertor from 'convert-string-to-number';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { NodeMailService } from 'src/mail/node-mail.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wl_Account)
    private readonly _wlAccountRepo: Repository<Wl_Account>,
    @InjectRepository(Wallet_Transaction)
    private readonly _walletRepo: Repository<Wallet_Transaction>,
    @Inject('JWT-SERVICE') private jwt: JwtService,
    @Inject('GENERAL-SERVICE') private _general: GeneralService,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('STRIPE-SERVICE') private _stripe: StripeService,
    private _mailer: NodeMailService,
  ) {}

  async getWalletBalance(req: Request) {
    try {
      const accessToken = req.headers.authorization;
      const decodeAccessToken: any = this.jwt.decodeAccessToken(accessToken);
      const isVerified = this._general.verifyWLAcc(
        decodeAccessToken,
        accessToken,
      );

      if (!isVerified) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid Token or may be Invlid WL ID !',
          null,
          req,
        );
      }

      const { id } = decodeAccessToken;
      const wlAccount: Wl_Account = await this._wlAccountRepo.findOne({
        where: {
          id: parseInt(id),
          deleted_at: IsNull(),
        },
      });
      const data = {
        amount: wlAccount.wallet_balance,
      };
      return this.res.generateResponse(
        HttpStatus.OK,
        'Wallet Amount',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async rechargeWallet(body: RechargeWalletDto, req: Request) {
    try {
      const { stripe_token, amount } = body;
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const isValidAcc: Wl_Account = await this._wlAccountRepo.findOne({
        where: {
          id: wl_acount.id,
          deleted_at: IsNull(),
        },
      });

      if (!isValidAcc) {
        this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'WL account ID is invalid or account may be deleted!',
          null,
          req,
        );
      }

      // const tokenPayload = {
      //     card_cvc: cvv,
      //     card_month: month,
      //     card_number: cardNumber,
      //     card_year: year
      // }

      const token = stripe_token;

      if (!token) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid card details!',
          null,
          req,
        );
      }

      let Amount = convertor(amount);
      let _amount: any = Amount * 100;
      _amount = _amount.toFixed(0); // amount in cent

      const chargePayload = {
        token: token,
        description: `whitelable (${wl_acount.email}) recharge wallet`,
        amount: _amount,
      };

      const charge = await this._stripe.stripeCharge(chargePayload);

      if (!charge) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'please provide valid amount!',
          null,
          req,
        );
      }

      const transactions = await this._walletRepo.find({
        where: {
          deleted_at: IsNull(),
          wl_id: {
            id: isValidAcc.id,
          },
        },
        order: {
          id: 'DESC',
        },
      });

      const lastTransactionBalance: any = transactions[0].balance;

      const payload = {
        message: `you have recharge your wallet`,
        credit: convertor(amount),
        debit: null,
        wl_id: isValidAcc,
        balance: convertor(lastTransactionBalance) + convertor(amount),
      };

      const createWalletHistory = this._walletRepo.create(payload);
      await this._walletRepo.save(createWalletHistory);

      let currentBalance: any = isValidAcc.wallet_balance;

      await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .update()
        .set({
          wallet_balance: convertor(currentBalance) + convertor(amount),
        })
        .where('id = :id', { id: isValidAcc.id })
        .execute();

      const emailData = {
        to: isValidAcc.email,
        amount: amount,
        name: isValidAcc.username,
        recharge_no: `WLW-${createWalletHistory.id}`,
      };

      await this._mailer.sendWalletTopupEmail(emailData);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Balance added into wallet successfully!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllWalletTransactionsPagination(
    query: PaginationDto,
    body: any,
    req: Request,
  ) {
    try {
      const { page, pageSize, searchStr, start_date, end_date } = query;

      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      let whereCondition: any;
      if (start_date && end_date) {
        whereCondition = {
          message: Like(`%${searchStr}%`),
          deleted_at: IsNull(),
          wl_id: {
            id: wl_acount.id,
          },
          created_at: Between(start_date, end_date),
        };
      } else {
        whereCondition = {
          message: Like(`%${searchStr}%`),
          deleted_at: IsNull(),
          wl_id: {
            id: wl_acount.id,
          },
        };
      }

      const transactions = await this._walletRepo.find({
        where: whereCondition,
        relations: {
          wl_id: true,
        },
        select: {
          wl_id: {
            username: true,
            email: true,
            contact_no: true,
          },
        },
        order: {
          ...body,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const rawList = await this._walletRepo.find({
        where: whereCondition,
      });

      const transactionIds = rawList.map((ele) => ele.id);

      const total = await this._walletRepo
        .createQueryBuilder('wallet_trans')
        .where({
          id: In(transactionIds),
        })
        .select('SUM(wallet_trans.credit)', 'totalCredit')
        .addSelect('SUM(wallet_trans.debit)', 'totalDebit')
        .getRawOne();

      const count = await this._walletRepo.count({
        where: whereCondition,
      });

      const data = {
        list: transactions,
        total_count: count,
        page,
        pageSize,
        totalCredit: total.totalCredit ? total.totalCredit : '00.00',
        totalDebit: total.totalDebit ? total.totalDebit : '00.00',
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Transaction List',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllWalletTransactions(req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const transactions = await this._walletRepo.find({
        where: [
          {
            deleted_at: IsNull(),
            wl_id: {
              id: wl_acount.id,
            },
          },
        ],
        relations: {
          wl_id: true,
        },
        select: {
          wl_id: {
            username: true,
            email: true,
            contact_no: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Transactions List',
        transactions,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

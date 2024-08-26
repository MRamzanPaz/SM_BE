import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Orders } from 'src/entities/order.entity';
import { RefundActivities } from 'src/entities/refundActivity.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { NodeMailService } from 'src/mail/node-mail.service';
import { JwtService } from 'src/shared/services/jwt.service';
import { ResponseService } from 'src/shared/services/response.service';
import { IsNull, Repository } from 'typeorm';
import { AdminAcceptDto, PartnerRequestDto } from './refund.dto';
import { ApiService } from 'src/shared/services/api.service';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import convertor from 'convert-string-to-number';

@Injectable()
export class RefundService {
  constructor(
    @InjectRepository(Orders) private readonly _ordersRepo: Repository<Orders>,
    @InjectRepository(Wl_Account)
    private readonly _wlAccountRepo: Repository<Wl_Account>,
    @InjectRepository(RefundActivities)
    private readonly _refundRepo: Repository<RefundActivities>,
    @InjectRepository(Wallet_Transaction)
    private readonly _walletRepo: Repository<Wallet_Transaction>,
    @Inject('JWT-SERVICE') private jwt: JwtService,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
    private _mailer: NodeMailService,
  ) {}

  async RequestRefundByPartner(body: PartnerRequestDto, req: Request) {
    try {
      const { order_no } = body;

      const decodedToken: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: decodedToken.id,
        },
      });

      if (!whitelabel) {
        throw new HttpException('Invalid Request', HttpStatus.BAD_REQUEST);
      }

      const order = await this._ordersRepo.findOne({
        where: {
          deleted_at: IsNull(),
          status: 'COMPLETED',
          order_id: order_no,
          wl_id: {
            id: whitelabel.id,
          },
        },
        relations: {
          plan_id: {
            vendor: true,
          },
        },
      });

      if (!order) {
        throw new HttpException(
          'This order cannot be refunded or not belong to you',
          HttpStatus.FORBIDDEN,
        );
      }

      if (
        order.plan_id.vendor.name != 'esim-go' &&
        order.plan_id.vendor.name != 'red-tea'
      ) {
        throw new HttpException(
          'This ICCID cannot be refunded',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const isAlreadyExsit = await this._refundRepo.findOne({
        where: {
          deleted_at: IsNull(),
          order_no: order_no,
        },
      });

      if (isAlreadyExsit) {
        throw new HttpException(
          'This ICCID cannot be refunded as it already in queue',
          HttpStatus.BAD_REQUEST,
        );
      }

      const payload = {
        status: 'REQUESTED',
        order_no: order.order_id,
        order: order,
        whitelabel: whitelabel,
        note: 'You have requested to refund order',
      };

      const createRefund = this._refundRepo.create(payload);
      await this._refundRepo.save(createRefund);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Refund request has been sent',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async CancelRefundByPartner(id: string, req: Request) {
    try {
      const decodedToken: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: decodedToken.id,
        },
      });

      const refundReq = await this._refundRepo.findOne({
        where: {
          id: parseInt(id),
          whitelabel: {
            id: whitelabel.id,
          },
        },
      });

      if (!refundReq) {
        throw new HttpException(
          'Invalid request ID provided!',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (refundReq.status !== 'REQUESTED') {
        throw new HttpException(
          'This request cannot be cancelled!',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this._refundRepo
        .createQueryBuilder()
        .update()
        .set({
          note: 'You have cancelled your refund request!',
          status: 'CANCELLED',
        })
        .where('deleted_at IS NULL AND id = :id', { id: refundReq.id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Refund request has been cancelled',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllPartnerWiseRequest(req: Request) {
    try {
      const decodedToken: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: decodedToken.id,
        },
      });

      const refundReqs = await this._refundRepo.find({
        where: {
          deleted_at: IsNull(),
          whitelabel: {
            id: whitelabel.id,
          },
        },
        relations: {
          order: {
            plan_id: true,
            order_details: true,
            transaction: true,
          },
        },
        select: {
          id: true,
          note: true,
          status: true,
          created_at: true,
          order_no: true,
          order: {
            id: true,
            order_id: true,
            status: true,

            plan_id: {
              id: true,
              plan_name: true,
              validity: true,
              data: true,
            },
          },
        },
        order: {
          id: 'DESC',
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Requests list',
        refundReqs,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async checkRefundStatus(order_id: string, req: Request) {
    try {
      const refund = await this._refundRepo.findOne({
        where: {
          order_no: order_id,
        },
        relations: {
          order: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Refund Status',
        refund,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async acceptRefundReqByAdmin(body: AdminAcceptDto, req: Request) {
    try {
      const { request_id } = body;

      const request = await this._refundRepo.findOne({
        where: {
          deleted_at: IsNull(),
          status: 'REQUESTED',
          id: request_id,
        },
        relations: {
          order: {
            plan_id: {
              vendor: true,
            },
            order_details: true,
            transaction: true,
            wl_id: true,
          },
          whitelabel: true,
        },
      });

      if (!request) {
        throw new HttpException('Invalid request ID', HttpStatus.BAD_REQUEST);
      }

      const isRefunded = await this.refund(request);
      if (!isRefunded) {
        throw new HttpException(
          'This Iccid cannot be refund by vendor',
          HttpStatus.BAD_REQUEST,
        );
      }

      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: request.whitelabel.id,
        },
      });

      const transactions = await this._walletRepo.find({
        where: {
          deleted_at: IsNull(),
          wl_id: {
            id: whitelabel.id,
          },
        },
        order: {
          id: 'DESC',
        },
      });

      const lastTransactionBalance: any = transactions[0].balance;

      const payload = {
        message: `System Add balance into ${whitelabel.username} by refunded order ${request.order_no}`,
        credit: request.order.transaction.debit,
        debit: null,
        wl_id: whitelabel,
        balance:
          convertor(lastTransactionBalance) +
          convertor(request.order.transaction.debit),
      };

      const createWalletHistory = this._walletRepo.create(payload);
      await this._walletRepo.save(createWalletHistory);

      await this._wlAccountRepo
        .createQueryBuilder()
        .update()
        .set({
          wallet_balance:
            convertor(lastTransactionBalance) +
            convertor(request.order.transaction.debit),
        })
        .where('id = :id', { id: whitelabel.id })
        .execute();

      await this._refundRepo
        .createQueryBuilder()
        .update()
        .set({
          status: 'APPROVED',
          note: 'Admin approved your request',
        })
        .where(' id = :id ', { id: request_id })
        .execute();

      await this._ordersRepo
        .createQueryBuilder()
        .update()
        .set({
          status: 'REFUNDED',
        })
        .where(' order_id = :order_id', { order_id: request.order_no })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Request approved!',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async refund(request: RefundActivities) {
    // console.log(plan);

    const vendorsSelector: any[] = ['esim-go', 'red-tea'];

    const selectedVendor: number = vendorsSelector.findIndex(
      (_vendoer: string) =>
        _vendoer.includes(request.order.plan_id.vendor.name.toLowerCase()),
    );

    return await this.triggerAPi(selectedVendor, request);
  }

  async triggerAPi(selectedVendor: number, request: RefundActivities) {
    let ret: Boolean = false;
    switch (selectedVendor) {
      case 0:
        ret = await this.refundEsimGoIccid(request);
        break;
      case 1:
        ret = await this.refundRedTeaIccid(request);
        break;
      default:
        break;
    }

    return ret;
  }

  async refundEsimGoIccid(request: RefundActivities) {
    try {
      const iccid = request.order.order_details.iccid;
      const bundle = request.order.plan_id.package_name;
      const type = process.env.NODE_ENV == 'dev' ? 'validate' : 'transaction';

      const response = await this._api.refundEsimGoBundle(iccid, bundle, type);
      console.log(response);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async refundRedTeaIccid(request: RefundActivities) {
    try {
      const iccid = request.order.order_details.iccid;

      if (process.env.NODE_ENV == 'prod') {
        const payload = {
          iccid: iccid,
        };
        const response = await this._api.redTeaRevokeProfile(payload);
        console.log(response);
      }

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async rejectRefundReqByAdmin(body: AdminAcceptDto, req: Request) {
    try {
      const { request_id } = body;

      const request = await this._refundRepo.findOne({
        where: {
          deleted_at: IsNull(),
          status: 'REQUESTED',
          id: request_id,
        },
      });

      if (!request) {
        throw new HttpException('Invalid request ID', HttpStatus.BAD_REQUEST);
      }

      await this._refundRepo
        .createQueryBuilder()
        .update()
        .set({
          status: 'REJECTED',
          note: 'Admin reject your refund request',
        })
        .where(' id = :id ', { id: request_id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Request rejected!',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllAdminWiseRequest(req: Request) {
    try {
      const refundReqs = await this._refundRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          order: {
            plan_id: true,
            order_details: true,
            transaction: true,
            wl_id: true,
          },
        },
        select: {
          id: true,
          note: true,
          status: true,
          created_at: true,
          order_no: true,
          order: {
            id: true,
            order_id: true,
            status: true,

            plan_id: {
              id: true,
              plan_name: true,
              validity: true,
              data: true,
            },
            wl_id: {
              username: true,
            },
          },
        },
        order: {
          id: 'DESC',
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Requests list',
        refundReqs,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

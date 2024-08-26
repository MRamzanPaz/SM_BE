import {
  HttpStatus,
  Inject,
  Injectable,
  Body,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import { ResponseService } from 'src/shared/services/response.service';
import { In, IsNull, Like, Repository } from 'typeorm';
import {
  ActivateEsimDto,
  CancleOrderDto,
  CompleteOrderDto,
  FilterOrderList,
  PaginationDto,
  RequestOrderDto,
} from './products.dto';
import { Orders } from 'src/entities/order.entity';
import { JwtService } from 'src/shared/services/jwt.service';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { ApiService } from 'src/shared/services/api.service';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { Vendors } from 'src/entities/vendors.entity';
import * as qrcode from 'qrcode';
import { join } from 'path';
import * as moment from 'moment';
import { NodeMailService } from 'src/mail/node-mail.service';
import * as generator from 'otp-generator';
import { log } from 'console';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';
import * as fs from 'fs';
import * as path from 'path';

// Ensure the directory exists
const qrCodeDir = path.resolve(__dirname, '..', '..', 'qr-codes');
if (!fs.existsSync(qrCodeDir)) {
  fs.mkdirSync(qrCodeDir, { recursive: true });
}
@Injectable()
export class RbPlansService {
  constructor(
    @InjectRepository(eSimPlans)
    private readonly _eSimPlansRepo: Repository<eSimPlans>,
    @InjectRepository(AssignPlanToWl)
    private readonly _assignPlanRepo: Repository<AssignPlanToWl>,
    @InjectRepository(Orders) private readonly _ordersRepo: Repository<Orders>,
    @InjectRepository(OrderDetails)
    private readonly _ordersDetailRepo: Repository<OrderDetails>,
    @InjectRepository(Wl_Account)
    private readonly _wlAccountRepo: Repository<Wl_Account>,
    @InjectRepository(Inventory)
    private readonly _inventoryRepo: Repository<Inventory>,
    @InjectRepository(Wallet_Transaction)
    private readonly _walletRepo: Repository<Wallet_Transaction>,
    @InjectRepository(ActivatedESims)
    private readonly _activateEsimRepo: Repository<ActivatedESims>,
    @InjectRepository(eSimPlans)
    private readonly _plansRepo: Repository<eSimPlans>,
    @InjectRepository(TopUpHistory)
    private readonly _TopupRepo: Repository<TopUpHistory>,
    @InjectRepository(VendorsOrder)
    private readonly _vendorOrdersRepo: Repository<VendorsOrder>,
    @Inject('JWT-SERVICE') private jwt: JwtService,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
    private _mailer: NodeMailService,
  ) {}

  async getAllEsimPLan(params: PaginationDto, body: any, req: Request) {
    try {
      // console.log("run")
      const { page, pageSize, searchStr } = params;

      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const findALlAssignPlan: any[] = await this._assignPlanRepo.find({
        relations: {
          plan: {
            vendor: true,
            countries: true,
          },
        },
        where: {
          plan: [
            { plan_name: Like(`%${searchStr}%`) },
            { data: Like(`%${searchStr}%`) },
            { validity: Like(`%${searchStr}%`) },
          ],
          wl_account: {
            id: wl_acount.id,
          },
          deleted_at: IsNull(),
        },
        select: {
          plan: {
            countries: {
              country_name: true,
              country_code: true,
              iso2: true,
              iso3: true,
              phone_code: true,
              id: true,
            },
          },
        },
        order: {
          ...body,
        },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      });

      const count = await this._assignPlanRepo.count({
        relations: {
          plan: {
            vendor: true,
            countries: true,
          },
        },
        where: {
          plan: [
            { plan_name: Like(`%${searchStr}%`) },
            { data: Like(`%${searchStr}%`) },
            { validity: Like(`%${searchStr}%`) },
          ],
          wl_account: {
            id: wl_acount.id,
          },
          deleted_at: IsNull(),
        },
        select: {
          plan: {
            countries: {
              country_name: true,
              country_code: true,
              iso2: true,
              iso3: true,
              phone_code: true,
              id: true,
            },
          },
        },
      });

      const data = [];

      for (const plan of findALlAssignPlan) {
        let PLAN = {
          id: plan.plan.id,
          name: plan.plan.plan_name,
          price:
            plan.price_mode == 1
              ? plan.plan.wholesale_price
              : plan.price_mode == 2
              ? plan.plan.retail_price
              : plan.plan.platinum_price,
          data: plan.plan.data,
          validity: plan.plan.validity,
          region: plan.plan.region,
          planType: plan.plan.vendor.inventory_type == 1 ? 'E-SIM' : 'P-ESIM',
          countries: plan.plan.countries,
          testPlan: plan.plan.test_plan,
          singleUse: plan.plan.singleUse,
          global_plan: plan.plan.global_plan,
          isRegional: plan.plan.isRegional,
          recharge_only: plan.plan.recharge_only,
          msisdn: plan.plan.msisdn,
          voicemail_system: plan.plan.voicemail_system,
          state: plan.plan.state,
          rate_center: plan.plan.rate_center,
        };

        data.push(PLAN);
      }

      const retData = {
        list: data,
        total_count: count,
        page: page,
        pageSize: pageSize,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Plan List',
        retData,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllProduct(req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const findALlAssignPlan: any[] = await this._assignPlanRepo.find({
        relations: {
          plan: {
            vendor: true,
            countries: true,
          },
        },
        where: {
          wl_account: {
            id: wl_acount.id,
          },
          deleted_at: IsNull(),
        },
        select: {
          plan: {
            countries: {
              country_name: true,
              country_code: true,
              iso2: true,
              iso3: true,
              phone_code: true,
              id: true,
            },
          },
        },
      });

      const data = [];

      for (const plan of findALlAssignPlan) {
        let PLAN = {
          id: plan.plan.id,
          name: plan.plan.plan_name,
          description: plan.plan.description, 
          price:
            plan.price_mode == 1
              ? plan.plan.wholesale_price
              : plan.price_mode == 2
              ? plan.plan.retail_price
              : plan.plan.platinum_price,
          data: plan.plan.data,
          validity: plan.plan.validity,
          region: plan.plan.region,
          planType: plan.plan.vendor.inventory_type == 1 ? 'E-SIM' : 'P-ESIM',
          countries: plan.plan.countries,
          testPlan: plan.plan.test_plan,
          singleUse: plan.plan.singleUse,
          global_plan: plan.plan.global_plan,
          isRegional: plan.plan.isRegional,
          recharge_only: plan.plan.recharge_only,
          msisdn: plan.plan.msisdn,
          voicemail_system: plan.plan.voicemail_system,
          state: plan.plan.state,
          rate_center: plan.plan.rate_center,
        };

        data.push(PLAN);
      }

      return this.res.generateResponse(HttpStatus.OK, 'Plan List', data, req);
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getProductById(id: string, req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const findAssignPlan: AssignPlanToWl = await this._assignPlanRepo.findOne(
        {
          relations: {
            plan: {
              countries: true,
              vendor: true,
            },
          },
          where: {
            wl_account: {
              id: wl_acount.id,
            },
            plan: {
              id: parseInt(id),
            },
            deleted_at: IsNull(),
          },
        },
      );

      if (!findAssignPlan) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Plan not found!',
          null,
          req,
        );
      }

      const data = {
        id: findAssignPlan.plan.id,
        name: findAssignPlan.plan.plan_name,
        price:
          findAssignPlan.price_mode == 1
            ? findAssignPlan.plan.wholesale_price
            : findAssignPlan.price_mode == 2
            ? findAssignPlan.plan.retail_price
            : findAssignPlan.plan.platinum_price,
        data: findAssignPlan.plan.data,
        validity: findAssignPlan.plan.validity,
        region: findAssignPlan.plan.region,
        planType:
          findAssignPlan.plan.vendor.inventory_type == 1 ? 'E-SIM' : 'P-ESIM',
        countries: findAssignPlan.plan.countries,
        testPlan: findAssignPlan.plan.test_plan,
        singleUse: findAssignPlan.plan.singleUse,
        global_plan: findAssignPlan.plan.global_plan,
        isRegional: findAssignPlan.plan.isRegional,
        msisdn: findAssignPlan.plan.msisdn,
        voicemail_system: findAssignPlan.plan.voicemail_system,
        state: findAssignPlan.plan.state,
        rate_center: findAssignPlan.plan.rate_center,
      };

      return this.res.generateResponse(HttpStatus.OK, 'Plan', data, req);
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async requestOrder(body: RequestOrderDto, req: Request) {
    try {
      // validate order request query start
      const { plan_id, email } = body;
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const IsAssigned = await this._assignPlanRepo.findOne({
        where: {
          wl_account: {
            id: wl_acount.id,
          },
          plan: {
            id: plan_id,
          },
          deleted_at: IsNull(),
        },
      });

      if (!IsAssigned) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Plan ID is not valid!',
          null,
          req,
        );
      }

      // validate order request query end

      // process order request start

      const plan: eSimPlans = await this._eSimPlansRepo.findOne({
        where: {
          id: plan_id,
        },
      });

      const WL_Account = await this._wlAccountRepo.findOne({
        where: {
          id: wl_acount.id,
        },
      });

      const playLoad: any = {
        plan_id: plan,
        wl_id: WL_Account,
        status: 'PENDING',
        // email: email,
        price_mode: IsAssigned.price_mode,
        isRetailPrice: IsAssigned.isRetailPrice,
      };

      const createOrder = this._ordersRepo.create(playLoad);
      const saveOrder: any = await this._ordersRepo.save(createOrder);

      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          order_id: `SM-${saveOrder.id}`,
        })
        .where('id = :id', { id: parseInt(saveOrder.id) })
        .execute();

      // process order request end

      const data: any = {
        order_id: `SM-${saveOrder.id}`,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Product requested successfully!',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async cancelOrder(body: CancleOrderDto, req: Request) {
    try {
      const { order_id, reason } = body;

      const findOrder = await this._ordersRepo.findOne({
        where: {
          order_id: order_id,
          deleted_at: IsNull(),
        },
      });

      if (!findOrder) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Order might be cancelled earlier!',
          null,
          req,
        );
      }

      const cancelOrder = await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          status: 'CANCELLED',
          deleted_at: new Date(),
        })
        .where('order_id = :order_id', { order_id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Order cancelled successfully!',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async completeOrder(body: CompleteOrderDto, req: Request) {
    try {
      const wl_account: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );
      const { order_id, email } = body;
      // console.log(email);

      const findOrder: Orders = await this._ordersRepo.findOne({
        where: {
          order_id: order_id,
          deleted_at: IsNull(),
          wl_id: {
            id: wl_account.id,
          },
        },
        relations: {
          order_details: true,
          wl_id: true,
          plan_id: true,
        },
      });

      // return findOrder;

      if (!findOrder) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Order might be cancelled earlier!',
          null,
          req,
        );
      }

      if (findOrder.status == 'COMPLETED') {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          `Order ${order_id} has been already completed!`,
          null,
          req,
        );
      }

      const plan: eSimPlans = await this._eSimPlansRepo.findOne({
        where: {
          id: findOrder.plan_id.id,
          deleted_at: IsNull(),
        },
        relations: {
          vendor: true,
          countries: true,
        },
        select: {
          countries: {
            country_name: true,
            country_code: true,
            iso2: true,
            iso3: true,
            phone_code: true,
            id: true,
          },
        },
      });

      // return plan

      if (!plan) {
        return this.res.generateError(
          `plan not found of id = ${findOrder.plan_id.id}`,
          req,
        );
      }

      if (plan.test_plan) {
        await this._ordersRepo
          .createQueryBuilder('Orders')
          .update()
          .set({
            status: 'COMPLETED',
            order_details: null,
          })
          .where('order_id = :order_id', { order_id: order_id })
          .execute();

        const data: any = {
          order_id: order_id,
          order_status: 'COMPLETED',
          email: email,
          qr_code: 'LPA:1$RSP-0026.OBERTHUR.NET$1IC3X-U0OT6-QBZHF-HUGAP',
          qrcode_url:
            'https://sandbox.worldroambuddy.com/qr?expires=1771409796&id=17536&signature=2050b6d57adb4126d406ea579d7c7ec8d996b03854315c09c055ead626040d6f',
          apn: 'No APN required',
          data_roaming: 'ON',
          iccid: '8944465400000424256',
          plan: {
            id: plan.id,
            name: plan.plan_name,
            price: findOrder.isRetailPrice
              ? plan.retail_price
              : plan.wholesale_price,
            data: plan.data,
            validity: plan.validity,
            region: plan.region,
            planType:
              plan.vendor.inventory_type == 1 ? 'E-SIM' : 'PHYSICAL-SIM',
            countries: plan.countries,
            test_plan: plan.test_plan,
            signle_use: plan.singleUse,
            global_plan: plan.global_plan,
          },
        };

        await this.sendOrderEmail(findOrder, data);

        return this.res.generateResponse(
          HttpStatus.OK,
          `${order_id} order has been completed .`,
          data,
          req,
        );
      }

      let amount: any =
        findOrder.price_mode == 1
          ? plan.wholesale_price
          : findOrder.price_mode == 2
          ? plan.retail_price
          : plan.platinum_price;
      amount = parseFloat(amount);

      const isValidBalance = await this.checkWalletBalnc(amount, findOrder);
      console.log('isValidBalance = ', isValidBalance);
      if (!isValidBalance) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'In-sufficient balance, please recharge your wallet to make orders',
          null,
          req,
        );
      }

      if (plan.plan_type == 1) {
        const lookUpInventory: Inventory = await this._inventoryRepo.findOne({
          where: {
            package_name: plan.package_name,
            deleted_at: IsNull(),
            status: 'IN-STOCK',
            vendor: {
              id: plan.vendor.id,
            },
          },
        });

        if (!lookUpInventory) {
          return this.res.generateResponse(
            HttpStatus.BAD_REQUEST,
            'Product out of stock!',
            null,
            req,
          );
        }

        await this._inventoryRepo
          .createQueryBuilder('Inventory')
          .update()
          .set({
            status: 'ASSIGNED',
          })
          .where('id = :id', { id: lookUpInventory.id })
          .execute();

        const OrderDetails = this._ordersDetailRepo.create({
          apn: 'No APN required',
          iccid: lookUpInventory.iccid,
          qr_code: lookUpInventory.qr_code,
          qrcode_url: lookUpInventory.qrcode_url,
          data_roaming: 'ON',
          package_name: lookUpInventory.package_name,
        });

        await this._ordersDetailRepo.save(OrderDetails);

        const transactionSuccessfull = await this.performWalletTransaction(
          amount,
          order_id,
          req,
        );

        if (!transactionSuccessfull) {
          return this.res.generateResponse(
            HttpStatus.BAD_REQUEST,
            'insufficient wallet balance! ',
            null,
            req,
          );
        }

        await this._ordersRepo
          .createQueryBuilder('Orders')
          .update()
          .set({
            status: 'COMPLETED',
            order_details: OrderDetails,
            transaction: transactionSuccessfull,
          })
          .where('order_id = :order_id', { order_id: order_id })
          .execute();

        const data: any = {
          order_id: order_id,
          order_status: 'COMPLETED',
          email: email,
          qr_code: lookUpInventory.qr_code,
          qrcode_url: lookUpInventory.qrcode_url,
          apn: 'No APN required',
          data_roaming: 'ON',
          iccid: lookUpInventory.iccid,
          msisdn: lookUpInventory.msisdn,
          voicemail_system: lookUpInventory.voicemail_system,
          state: lookUpInventory.state,
          rate_center: lookUpInventory.rate_center,
          plan: {
            id: plan.id,
            name: plan.plan_name,
            price: findOrder.isRetailPrice
              ? plan.retail_price
              : plan.wholesale_price,
            data: plan.data,
            validity: plan.validity,
            region: plan.region,
            planType:
              plan.vendor.inventory_type == 1 ? 'E-SIM' : 'PHYSICAL-SIM',
            countries: plan.countries,
            test_plan: plan.test_plan,
            signle_use: plan.singleUse,
            global_plan: plan.global_plan,
          },
        };

        await this.sendOrderEmail(findOrder, data);

        return this.res.generateResponse(
          HttpStatus.OK,
          `${order_id} order has been completed .`,
          data,
          req,
        );
      } else if (plan.plan_type == 2) {
        const order_data = {
          order_id,
          email: findOrder.wl_id.email,
          isRetailPrice: findOrder.isRetailPrice,
          // transaction: transactionSuccessfull,
          amount: amount,
          wl_email: findOrder.wl_id.email,
          order: findOrder,
          price_mode: findOrder.price_mode,
        };

        //  console.log(order_data);
        const response = await this.getEsim(plan, order_data, req);
        console.log(response);
        return response;
      } else {
        const error = {
          message: 'Invalid plan type! please provide valid plan type!',
        };
        this.res.generateError(error, req);
      }
    } catch (error) {
      console.log('HIIIIII');
      console.log(error);
      return this.res.generateError(error, req);
    }
  }

  async getEsim(plan: eSimPlans, order: any, req: Request) {
    // console.log(plan);
    try {
      const vendorsSelector: any[] = [
        'airalo',
        'esim-go',
        'keepgo',
        'red-tea',
        'mobi-matter',
        'flexiroam',
      ];

      const selectedVendor: number = vendorsSelector.findIndex(
        (_vendoer: string) => _vendoer.includes(plan.vendor.name.toLowerCase()),
      );

      return await this.triggerAPi(selectedVendor, plan, order, req);
    } catch (error) {
      console.log('HIII3');
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR, {
        cause: error,
      });
    }
  }

  async triggerAPi(
    selectedVendor: number,
    plan: eSimPlans,
    order: any,
    req: Request,
  ) {
    try {
      let ret: any;
      // console.log(selectedVendor)
      switch (selectedVendor) {
        case 0:
          ret = await this.Airalo(plan, order, req);
          break;
        case 1:
          ret = await this.eSimGO(plan, order, req);
          break;
        case 2:
          ret = await this.keepGo(plan, order, req);
          break;
        case 3:
          ret = await this.RedTea(plan, order, req);
          break;
        case 4:
          ret = await this.mobiMatter(plan, order, req);
          break;
        case 5:
          ret = await this.flexiroam(plan, order, req);
          break;
        default:
          break;
      }

      return ret;
    } catch (error) {
      console.log('HIII2');
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR, {
        cause: error,
      });
    }
  }

  async Airalo(plan: eSimPlans, order: any, req: Request) {
    try {
      const body: any = {
        package_id: plan.package_name,
        quantity: '1',
      };

      const response = await this._api.airaloSubmitOrder(body);

      console.log('AIRALO ORDER', response);

      const { order_id, email, isRetailPrice } = order;

      const payload = {
        qr_code: response.data.sims[0].qrcode,
        qrcode_url: response.data.sims[0].qrcode_url,
        apn: response.data.sims[0].apn_value,
        iccid: response.data.sims[0].iccid,
        data_roaming: response.data.sims[0].is_roaming ? 'ON' : 'OFF',
        email: req.body.email,
      };

      const data = this.generateResponseData(plan, order, payload);

      const transactionSuccessfull = await this.performWalletTransaction(
        order.amount,
        order_id,
        req,
      );

      if (!transactionSuccessfull) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
          null,
          req,
        );
      }

      const vendorOrder = this._vendorOrdersRepo.create({
        cost_price: response.data.price,
        iccid: response.data.sims[0].iccid,
        package: plan.package_name,
        reference: response.data.id,
      });

      await this._vendorOrdersRepo.save(vendorOrder);

      this.setAiraloNetPrice(vendorOrder);

      const OrderDetails = this._ordersDetailRepo.create({
        apn: 'No APN required',
        iccid: response.data.sims[0].iccid,
        qr_code: response.data.sims[0].qrcode,
        qrcode_url: response.data.sims[0].qrcode_url,
        data_roaming: response.data.sims[0].is_roaming ? 'ON' : 'OFF',
        package_name: plan.package_name,
        vendors_order: vendorOrder,
      });

      await this._ordersDetailRepo.save(OrderDetails);

      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          status: 'COMPLETED',
          order_details: OrderDetails,
          transaction: transactionSuccessfull,
        })
        .where('order_id = :order_id', { order_id: order_id })
        .execute();

      await this.sendOrderEmail(order.order, data);
      return this.res.generateResponse(
        HttpStatus.OK,
        `${order_id} order has been completed .`,
        data,
        req,
      );
    } catch (error) {
      console.log('HIII@');
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR, {
        cause: error,
      });
    }
  }

  async setAiraloNetPrice(vo: VendorsOrder) {
    const filters: string[] = ['local', 'global'];

    const data: any[] = [];

    for (const filter of filters) {
      let maxPage = 1;

      for (let page = 1; page <= maxPage; page++) {
        console.log(page, filter, maxPage);

        const response = await this._api.getAirAloPackagesV2(page, 100, filter);

        response.data.forEach((element1: any) => {
          element1.operators.forEach((element2: any) => {
            element2.packages.forEach((element3: any) => {
              data.push(element3);
            });
          });
        });

        maxPage = response.meta.last_page;
      }
    }

    const airAloPackage = data.find((ele: any) => ele.id == vo.package);

    console.log('AIRALO_PACKAGE', airAloPackage);

    await this._vendorOrdersRepo
      .createQueryBuilder()
      .update()
      .set({
        cost_price: airAloPackage.net_price,
      })
      .where('id = :id', { id: vo.id })
      .execute();
  }

  async eSimGO(plan: eSimPlans, order: any, req: Request) {
    try {
      console.log('Esim go trigger!');

      const body = {
        type: process.env.NODE_ENV == 'prod' ? 'transaction' : 'validate',
        assign: true,
        Order: [
          {
            type: 'bundle',
            quantity: 1,
            item: plan.package_name,
          },
        ],
      };

      log('Esim-go body:', body);

      const orderDetails = await this._api.eSimGoProcessOrder(body);
      log('process order: ', orderDetails);
      const reference =
        process.env.NODE_ENV == 'prod'
          ? orderDetails.orderReference
          : process.env.ESIM_GO_ORDER_REF;

      let eSim: string = await this.getEsimgoDetails(reference);

      log('Esim Data:', eSim);

      eSim = eSim.replace('\n', ',');
      const tranform = eSim.split(',');

      const { order_id, email, isRetailPrice } = order;

      const QR_CODE: any = `LPA:1$${tranform[7]}$${tranform[6]}`;

      const IMAGE_NAME = `${tranform[5]}.png`;

      // await qrcode
      //   .toFile(`qr-codes/${IMAGE_NAME}`, QR_CODE, {
      //     errorCorrectionLevel: 'H',
      //     type: 'png',
      //   })
      await qrcode
        .toFile(path.join(qrCodeDir, IMAGE_NAME), QR_CODE, {
          errorCorrectionLevel: 'H',
          type: 'png',
        })
        .then(() => {
          console.log(
            `QR code saved successfully to ${path.join(qrCodeDir, IMAGE_NAME)}`,
          );
        })
        .catch((err) => {
          console.error('Error saving QR code:', err);
        })
        .finally(() => {
          console.log('QR code generation process completed.');
        })
        .finally();

      const transactionSuccessfull = await this.performWalletTransaction(
        order.amount,
        order_id,
        req,
      );

      if (!transactionSuccessfull) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
          null,
          req,
        );
      }

      const vendorOrder = this._vendorOrdersRepo.create({
        cost_price: orderDetails.order[0].pricePerUnit,
        iccid: tranform[5],
        package: plan.package_name,
        reference:
          process.env.NODE_ENV == 'prod'
            ? orderDetails.orderReference
            : process.env.ESIM_GO_ORDER_REF,
      });

      await this._vendorOrdersRepo.save(vendorOrder);

      const OrderDetails = this._ordersDetailRepo.create({
        apn: 'No APN required',
        iccid: tranform[5],
        qr_code: QR_CODE,
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        data_roaming: 'ON',
        package_name: plan.package_name,
        vendors_order: vendorOrder,
      });

      await this._ordersDetailRepo.save(OrderDetails);

      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          status: 'COMPLETED',
          order_details: OrderDetails,
          transaction: transactionSuccessfull,
        })
        .where('order_id = :order_id', { order_id: order_id })
        .execute();

      const payload = {
        qr_code: QR_CODE,
        apn: 'No APN required',
        iccid: tranform[5],
        data_roaming: 'ON',
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        email: req.body.email,
      };

      const data = this.generateResponseData(plan, order, payload);

      await this.sendOrderEmail(order.order, data);

      return this.res.generateResponse(
        HttpStatus.OK,
        `${order_id} order has been completed .`,
        data,
        req,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR, {
        cause: error,
      });
    }
  }

  async getEsimgoDetails(reference: any) {
    let eSim: string = await this._api.eSimGoGetData(reference);

    // log("Esim Data:", eSim)

    const rawData = eSim.replace('\n', ',');
    const tranform = rawData.split(',');

    log('ICCID', tranform[5]);
    if (tranform[5]) {
      return eSim;
    } else {
      log('Esim Data:', eSim);
      return await this.getEsimgoDetails(reference);
    }
  }

  async keepGo(plan: eSimPlans, order: any, req: Request) {
    try {
      const { order_id, email, isRetailPrice } = order;

      const body = {
        refill_mb: parseInt(plan.data) * 1024,
        refill_days: parseInt(plan.validity),
        bundle_id: plan.package_name,
        count: 1,
      };

      let response: any;

      if (process.env.NODE_ENV == 'prod') {
        response = await this._api.keepGoLineCreate(body);
      } else {
        response = {
          ack: 'success',
          sim_card: {
            iccid: '8910300001003044041',
            lpa_code: 'LPA:1$consumer.ppp.local$TN20210805541629D9E05F37',
          },
          data_bundle_id: 112,
        };
      }

      const QR_CODE: any = response.sim_card.lpa_code;
      // console.log(QR_CODE)
      const IMAGE_NAME = `${response.sim_card.iccid}.png`;

      await qrcode
        .toFile(`qr-codes/${IMAGE_NAME}`, QR_CODE, {
          errorCorrectionLevel: 'H',
          type: 'png',
        })
        .finally();

      const transactionSuccessfull = await this.performWalletTransaction(
        order.amount,
        order_id,
        req,
      );

      if (!transactionSuccessfull) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
          null,
          req,
        );
      }

      let keepGoBundle = await this._api.getKeepGoBundle(plan.package_name);
      keepGoBundle = keepGoBundle.bundle.refills.find((ele: any) => {
        if (ele.amount_mb == parseInt(plan.data) * 1024) {
          return ele;
        }
      });

      const vendorOrder = this._vendorOrdersRepo.create({
        cost_price: keepGoBundle.price_usd,
        iccid: response.sim_card.iccid,
        package: plan.package_name,
        reference: 'KEEP-GO',
      });

      await this._vendorOrdersRepo.save(vendorOrder);

      const payload = {
        qr_code: response.sim_card.lpa_code,
        apn: 'No APN required',
        iccid: response.sim_card.iccid,
        data_roaming: 'ON',
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        email: req.body.email,
      };

      const OrderDetails = this._ordersDetailRepo.create({
        apn: 'No APN required',
        iccid: response.sim_card.iccid,
        qr_code: response.sim_card.lpa_code,
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        data_roaming: 'ON',
        package_name: plan.package_name,
        vendors_order: vendorOrder,
      });

      await this._ordersDetailRepo.save(OrderDetails);

      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          status: 'COMPLETED',
          order_details: OrderDetails,
          transaction: transactionSuccessfull,
        })
        .where('order_id = :order_id', { order_id: order_id })
        .execute();

      const data = this.generateResponseData(plan, order, payload);

      await this.sendOrderEmail(order.order, data);

      return this.res.generateResponse(
        HttpStatus.OK,
        `${order_id} order has been completed .`,
        data,
        req,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR, {
        cause: error,
      });
    }
  }

  async RedTea(plan: eSimPlans, order: any, req: Request) {
    try {
      const { package_name, cost_price } = plan;

      const transaction_id = generator.generate(20, {
        digits: true,
        lowerCaseAlphabets: true,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      let payload: any = {
        transactionId: transaction_id,
        // amount: parseInt(cost_price),
        packageInfoList: [
          {
            packageCode: package_name,
            count: 1,
            // price: parseInt(cost_price) * 10000
          },
        ],
      };

      console.log('red tea =>', payload);

      let response: any = {
        errorCode: null,
        errorMsg: null,
        success: true,
        obj: { orderNo: 'B23071805026292' },
      };

      if (process.env.NODE_ENV != 'dev') {
        // console.log("run!!!")
        response = await this._api.redTeaOrderProfile(payload);
      }

      const redTeaOrderNumber = response.obj.orderNo;
      // console.log(response.obj.orderNo)

      payload = {
        orderNo: response.obj.orderNo,
        pager: {
          pageNum: 1,
          pageSize: 20,
        },
      };

      response = await this._api.getAllocateProfile(payload);
      console.log(response);

      const {
        obj: { esimList },
      } = response;
      // console.log(esimList[0].packageList)

      payload = {
        qr_code: esimList[0].ac,
        qrcode_url: esimList[0].qrCodeUrl,
        apn: 'No APN required',
        iccid: esimList[0].iccid,
        data_roaming: 'ON',
        email: req.body.email,
      };

      const data = this.generateResponseData(plan, order, payload);

      const transactionSuccessfull = await this.performWalletTransaction(
        order.amount,
        order.order_id,
        req,
      );

      if (!transactionSuccessfull) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
          null,
          req,
        );
      }

      const _package = await this.getRedTeaDataPackage(plan);

      console.log(_package.obj.packageList[0].price);

      const vendorOrder = this._vendorOrdersRepo.create({
        cost_price: _package.obj.packageList[0].price / 10000,
        iccid: esimList[0].iccid,
        package: plan.package_name,
        reference: redTeaOrderNumber,
      });

      await this._vendorOrdersRepo.save(vendorOrder);

      const OrderDetails = this._ordersDetailRepo.create({
        apn: 'No APN required',
        iccid: esimList[0].iccid,
        qr_code: esimList[0].ac,
        qrcode_url: esimList[0].qrCodeUrl,
        data_roaming: 'ON',
        package_name: plan.package_name,
        vendors_order: vendorOrder,
      });

      await this._ordersDetailRepo.save(OrderDetails);

      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          status: 'COMPLETED',
          order_details: OrderDetails,
          transaction: transactionSuccessfull,
        })
        .where('order_id = :order_id', { order_id: order.order_id })
        .execute();

      await this.sendOrderEmail(order.order, data);
      return this.res.generateResponse(
        HttpStatus.OK,
        `${order.order_id} order has been completed .`,
        data,
        req,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR, {
        cause: error,
      });
    }
  }

  async getRedTeaDataPackage(plan: eSimPlans) {
    let _package: any = null;

    let PAYLOAD = {
      packageCode: plan.package_name,
      // iccid :ORDER.iccid
    };

    _package = await this._api.getRedTeaPackage(PAYLOAD);

    if (_package.obj.packageList.length) {
      return _package;
    } else {
      let PAYLOAD = {
        slug: plan.package_name,
        // iccid :ORDER.iccid
      };

      _package = await this._api.getRedTeaPackage(PAYLOAD);

      return _package;
    }
  }

  async mobiMatter(plan: eSimPlans, order: any, req: Request) {
    try {
      const { package_name } = plan;

      const payloadCreateOrder = {
        productId: package_name,
        productCategory: 'esim_realtime',
      };

      let createOrderResponse: any = null;

      if (process.env.NODE_ENV == 'dev') {
        createOrderResponse = {
          result: {
            orderId: 'RB-2940265',
          },
        };
      } else {
        createOrderResponse = await this._api.mobiMatterCreateOrder(
          payloadCreateOrder,
        );
      }

      console.log(createOrderResponse);

      let mobiMatterOrder: any = null;

      if (process.env.NODE_ENV == 'dev') {
        const order_id = 'RB-2940265';
        const orderInfoResponse = await this._api.mobiMatterOrderInfo(order_id);
        console.log(orderInfoResponse);
        mobiMatterOrder = orderInfoResponse.result;
      } else {
        const completeOrderPayload = {
          orderId: createOrderResponse.result.orderId,
        };

        const completeOrderResponse = await this._api.mobiMatterCompleteOrder(
          completeOrderPayload,
        );
        mobiMatterOrder = completeOrderResponse.result;
      }

      console.log(mobiMatterOrder);

      const QR_CODE: any = mobiMatterOrder.orderLineItem.lineItemDetails.find(
        (ele: any) => ele.name == 'LOCAL_PROFILE_ASSISTANT',
      ).value;

      const ICCID: any = mobiMatterOrder.orderLineItem.lineItemDetails.find(
        (ele: any) => ele.name == 'ICCID',
      ).value;

      const APN: any = mobiMatterOrder.orderLineItem.lineItemDetails.find(
        (ele: any) => ele.name == 'ACCESS_POINT_NAME',
      ).value;

      console.log(ICCID);

      const IMAGE_NAME = `${ICCID}.png`;

      await qrcode
        .toFile(`qr-codes/${IMAGE_NAME}`, QR_CODE, {
          errorCorrectionLevel: 'H',
          type: 'png',
        })
        .finally();

      const payload = {
        qr_code: QR_CODE,
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        apn: APN,
        iccid: ICCID,
        data_roaming: 'ON',
        email: req.body.email,
      };

      const data = this.generateResponseData(plan, order, payload);

      const transactionSuccessfull = await this.performWalletTransaction(
        order.amount,
        order.order_id,
        req,
      );

      if (!transactionSuccessfull) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
          null,
          req,
        );
      }

      const vendorOrder = this._vendorOrdersRepo.create({
        cost_price: mobiMatterOrder.orderLineItem.wholesalePrice,
        iccid: ICCID,
        package: plan.package_name,
        reference: mobiMatterOrder.orderId,
      });

      await this._vendorOrdersRepo.save(vendorOrder);

      const OrderDetails = this._ordersDetailRepo.create({
        apn: 'No APN required',
        iccid: ICCID,
        qr_code: QR_CODE,
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        data_roaming: APN,
        package_name: plan.package_name,
        vendors_order: vendorOrder,
      });

      await this._ordersDetailRepo.save(OrderDetails);

      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          status: 'COMPLETED',
          order_details: OrderDetails,
          transaction: transactionSuccessfull,
        })
        .where('order_id = :order_id', { order_id: order.order_id })
        .execute();

      await this.sendOrderEmail(order.order, data);
      return this.res.generateResponse(
        HttpStatus.OK,
        `${order.order_id} order has been completed .`,
        data,
        req,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR, {
        cause: error,
      });
    }
  }

  async flexiroam(plan: eSimPlans, order: any, req: Request) {
    try {
      const { package_name } = plan;

      let flexiroamOrder: any;
      if (process.env.NODE_ENV == 'dev') {
        flexiroamOrder = {
          iccid: '89852351123060228056',
          qrcode: 'LPA:1$wbg.sandbox.ondemandconnectivity.com$V16AOPW2UN7WJBTP',
          orderNo: 'ORD-6601834dcfe66',
          cost_price: '1.00',
        };
      } else {
        const simPayload = {
          sim_type: 'eSIM',
          availability: 0,
        };
        const sims = await this._api.flexiroamGetSims(simPayload);

        if (sims.data.length) {
          const { iccid, qr_code_value, sku } = sims.data[0];

          const purchasePayload = {
            sku: sku,
            plan_code: package_name,
            plan_start_type_id: 1,
          };

          console.log(purchasePayload);

          const Order = await this._api.flexiroamPurchasePlan(purchasePayload);

          flexiroamOrder = {
            iccid: iccid,
            qrcode: qr_code_value,
            orderNo: Order.data.order_no,
            cost_price: Order.data.items[0].total_price,
          };
        } else {
          return this.res.generateResponse(
            HttpStatus.BAD_REQUEST,
            'no sim available in inventory ',
            null,
            req,
          );
        }
      }

      const IMAGE_NAME = `${flexiroamOrder.iccid}.png`;

      await qrcode
        .toFile(`qr-codes/${IMAGE_NAME}`, flexiroamOrder.qrcode, {
          errorCorrectionLevel: 'H',
          type: 'png',
        })
        .finally();

      const payload = {
        qr_code: flexiroamOrder.qrcode,
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        apn: 'No APN required',
        iccid: flexiroamOrder.iccid,
        data_roaming: 'ON',
        email: req.body.email,
      };

      const data = this.generateResponseData(plan, order, payload);

      const transactionSuccessfull = await this.performWalletTransaction(
        order.amount,
        order.order_id,
        req,
      );

      if (!transactionSuccessfull) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
          null,
          req,
        );
      }

      const vendorOrder = this._vendorOrdersRepo.create({
        cost_price: flexiroamOrder.cost_price,
        iccid: flexiroamOrder.iccid,
        package: plan.package_name,
        reference: flexiroamOrder.orderNo,
      });

      await this._vendorOrdersRepo.save(vendorOrder);

      const OrderDetails = this._ordersDetailRepo.create({
        apn: 'No APN required',
        iccid: flexiroamOrder.iccid,
        qr_code: flexiroamOrder.qrcode,
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        data_roaming: 'ON',
        package_name: plan.package_name,
        vendors_order: vendorOrder,
      });

      await this._ordersDetailRepo.save(OrderDetails);

      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          status: 'COMPLETED',
          order_details: OrderDetails,
          transaction: transactionSuccessfull,
        })
        .where('order_id = :order_id', { order_id: order.order_id })
        .execute();

      await this.sendOrderEmail(order.order, data);
      return this.res.generateResponse(
        HttpStatus.OK,
        `${order.order_id} order has been completed .`,
        data,
        req,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR, {
        cause: error,
      });
    }
  }

  generateResponseData(plan: eSimPlans, order: any, payload: any) {
    const { order_id, isRetailPrice, price_mode } = order;

    const { qr_code, apn, data_roaming, iccid, qrcode_url, email } = payload;

    const responseData: any = {
      order_id: order_id,
      order_status: 'COMPLETED',
      email: email,
      qr_code: qr_code,
      qrcode_url: qrcode_url,
      apn: apn,
      data_roaming: data_roaming,
      iccid: iccid,
      plan: {
        id: plan.id,
        name: plan.plan_name,
        price:
          price_mode == 1
            ? plan.wholesale_price
            : price_mode == 2
            ? plan.retail_price
            : plan.platinum_price,
        data: plan.data,
        validity: plan.validity,
        region: plan.region,
        planType: plan.vendor.inventory_type == 1 ? 'E-SIM' : 'PHYSICAL-SIM',
        countries: plan.countries,
        test_plan: plan.test_plan,
        signle_use: plan.singleUse,
        global_plan: plan.global_plan,
      },
    };

    return responseData;
  }

  async checkWalletBalnc(amount: number, order: Orders): Promise<Boolean> {
    const wallet_balance: any = order.wl_id.wallet_balance;
    let ret: Boolean = false;
    if (parseFloat(wallet_balance) < 50.0) {
      const emailData = {
        to: order.wl_id.email,
        balance: order.wl_id.wallet_balance,
      };
      await this._mailer.sendLowbalanceNotification(emailData);
    }
    if (parseFloat(wallet_balance) < amount) {
      ret = false;
    } else {
      ret = true;
    }

    return ret;
  }

  async performWalletTransaction(
    amount: number,
    order_id: string,
    req: Request,
  ) {
    let ret = true;

    const wl_acount: any = this.jwt.decodeAccessToken(
      req.headers.authorization,
    );

    const isValidAcc: Wl_Account = await this._wlAccountRepo.findOne({
      where: {
        id: wl_acount.id,
        deleted_at: IsNull(),
      },
    });

    let Balance: any = isValidAcc.wallet_balance;
    Balance = parseFloat(Balance);
    if (Balance < 50.0) {
      const emailData = {
        to: isValidAcc.email,
        balance: Balance,
      };
      await this._mailer.sendLowbalanceNotification(emailData);
    }
    if (Balance < amount) {
      ret = false;
      return ret;
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
      message: `System deduct balance from ${isValidAcc.username} by completed order ${order_id}`,
      credit: null,
      debit: amount,
      wl_id: isValidAcc,
      balance: parseFloat(lastTransactionBalance) - amount,
    };

    const createWalletHistory = this._walletRepo.create(payload);
    await this._walletRepo.save(createWalletHistory);

    let currentBalance: any = isValidAcc.wallet_balance;

    await this._wlAccountRepo
      .createQueryBuilder('Wl_Account')
      .update()
      .set({
        wallet_balance: parseFloat(currentBalance) - amount,
      })
      .where('id = :id', { id: wl_acount.id })
      .execute();

    return createWalletHistory;
  }

  spliteCode(qr_code: string) {
    const splitedCode = qr_code.split('$');
    return splitedCode;
  }

  async sendOrderEmail(order: Orders, data: any) {
    const emailData = {
      to: order.wl_id.email,
      customer_name: order.wl_id.username,
      order_id: order.order_id,
      order_date: moment(order.created_at).format('MMMM Do YYYY'),
      iccid: data?.iccid,
      apn: data?.apn,
      dataRoaming: data?.data_roaming,
      email: order.wl_id.email,
      packageData: data.plan.data,
      packageValidity: data.plan.validity,
      planName: order.plan_id.plan_name,
      payment: data.plan.price,
      iosAddress: this.spliteCode(data?.qr_code)[1],
      iosURL: this.spliteCode(data?.qr_code)[2],
      qrCodeString: data?.qr_code,
      qr_url: data?.qrcode_url,
    };

    await this._mailer.sendOrderEmail(emailData);
  }

  async getAllOrders(query: FilterOrderList, req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const wlAccountId = parseInt(wl_acount.id);

      console.log(wlAccountId);

      const { searchStr, wlId, start_date, end_date, orderType } = query;

      let allOrders: any[];

      const esimOrderQuery = `
                SELECT orders.id AS id, orders.order_id AS orderID, orders.created_at AS orderDate, od.iccid AS iccId, ep.plan_name AS planName, ep.data AS planData, ep.validity AS planValidity, wt.debit AS amount, wl.username AS whitelabel, orders.status AS orderStatus FROM orders AS orders
                LEFT JOIN e_sim_plans AS ep ON ep.id = orders.plan_id
                LEFT JOIN order_details AS od ON od.id = orders.detial_id
                LEFT JOIN wl_account AS wl ON wl.id = orders.wl_id
                LEFT JOIN wallet_transaction AS wt ON wt.id = orders.trans_id
                WHERE orders.deleted_at IS NULL
            `;

      const topupOrderQuery = `
                SELECT topuph.id AS id, topuph.order_no AS orderID, topuph.created_at AS orderDate, topuph.iccid AS iccId, ep.plan_name AS planName, ep.data AS planData, ep.validity AS planValidity, wt.debit AS amount, wl.username AS whitelabel, topuph.status AS orderStatus FROM top_up_history AS topuph
                LEFT JOIN e_sim_plans AS ep ON ep.id = topuph.plan_id
                LEFT JOIN wallet_transaction AS wt ON wt.id = topuph.wt_id
                LEFT JOIN wl_account AS wl ON wl.id = wt.wl_id
                WHERE topuph.deleted_at IS NULL
            `;

      if (parseInt(orderType) != 0) {
        if (parseInt(orderType) == 1) {
          if (start_date && end_date) {
            const esimOrders = await this._ordersRepo.query(`
                            ${esimOrderQuery} && wl.id = '${wlAccountId}' && orders.created_at BETWEEN '${start_date}' AND '${end_date}'
                            ORDER BY id DESC
                        `);
            allOrders = [];
            allOrders = [...esimOrders];
            return this.res.generateResponse(
              HttpStatus.OK,
              'Orders List',
              allOrders,
              req,
            );
          } else {
            const esimOrders = await this._ordersRepo.query(`
                            ${esimOrderQuery} && wl.id = '${wlAccountId}'
                            ORDER BY id DESC
                        `);
            allOrders = [];
            allOrders = [...esimOrders];
            return this.res.generateResponse(
              HttpStatus.OK,
              'Orders List',
              allOrders,
              req,
            );
          }
        }
        if (parseInt(orderType) == 2) {
          if (start_date && end_date) {
            const topupOrders = await this._TopupRepo.query(`
                            ${topupOrderQuery} && wl.id = '${wlAccountId}' && topuph.created_at BETWEEN '${start_date}' AND '${end_date}'
                            ORDER BY id DESC
                        `);
            allOrders = [];
            allOrders = [...topupOrders];
            return this.res.generateResponse(
              HttpStatus.OK,
              'Orders List',
              allOrders,
              req,
            );
          } else {
            const topupOrders = await this._TopupRepo.query(`
                            ${topupOrderQuery} && wl.id = '${wlAccountId}'
                            ORDER BY id DESC
                        `);
            allOrders = [];
            allOrders = [...topupOrders];
            return this.res.generateResponse(
              HttpStatus.OK,
              'Orders List',
              allOrders,
              req,
            );
          }
        }
      } else {
        if (start_date && end_date) {
          const esimOrders = await this._ordersRepo.query(`
                        ${esimOrderQuery} && wl.id = '${wlAccountId}' && orders.created_at BETWEEN '${start_date}' AND '${end_date}'
                        ORDER BY id DESC
                    `);

          const topupOrders = await this._TopupRepo.query(`   
                        ${topupOrderQuery} && wl.id = '${wlAccountId}' && topuph.created_at BETWEEN '${start_date}' AND '${end_date}'
                        ORDER BY id DESC
                    `);
          allOrders = [];
          allOrders = [...esimOrders, ...topupOrders];
          return this.res.generateResponse(
            HttpStatus.OK,
            'Orders List',
            allOrders,
            req,
          );
        } else {
          const esimOrders = await this._ordersRepo.query(`
                        ${esimOrderQuery} && wl.id = '${parseInt(wl_acount.id)}'
                        ORDER BY id DESC
                    `);

          const topupOrders = await this._TopupRepo.query(`   
                        ${topupOrderQuery} && wl.id = '${parseInt(
            wl_acount.id,
          )}'
                        ORDER BY id DESC
                    `);
          allOrders = [];
          allOrders = [...esimOrders, ...topupOrders];
          return this.res.generateResponse(
            HttpStatus.OK,
            'Orders List',
            allOrders,
            req,
          );
        }
      }
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getOrderDetails(orderId: string, req: Request) {
    try {
      let order: any = [];

      const topupOrders = await this._TopupRepo.findOne({
        where: {
          deleted_at: IsNull(),
          order_no: orderId,
        },
        relations: {
          plan: {
            vendor: true,
          },
          wallet_transaction: {
            wl_id: true,
          },
        },
      });

      if (topupOrders) {
        let orderPayload = {
          iccid: topupOrders.iccid,
          plan_id: { ...topupOrders.plan },
          vendorName: topupOrders.plan.vendor.name,
        };

        let active_bundle = await this.selectVendor(orderPayload);

        // console.log(active_bundle);

        if (!Object.keys(active_bundle).length) {
          active_bundle = {
            status: 'No active bundle available',
          };
        } else {
          active_bundle = {
            ...active_bundle,
            status: 'Data started',
          };

          if (
            active_bundle?.usage?.remaining_days ==
              parseInt(topupOrders.plan.validity) &&
            active_bundle?.usage?.remaining_in_gb ==
              parseInt(topupOrders.plan.data)
          ) {
            active_bundle = {
              ...active_bundle,
              status: 'eSIM installed',
            };
          }

          if (active_bundle?.usage?.remaining_in_gb == 0) {
            active_bundle = {
              ...active_bundle,
              status: 'Data finished',
            };
          }

          if (
            active_bundle?.plan == null &&
            active_bundle?.usage?.remaining_days == null
          ) {
            active_bundle = {
              status: 'eSIM not installed',
            };
          }
        }

        const topupHistory = await this._TopupRepo.find({
          where: {
            deleted_at: IsNull(),
            iccid: topupOrders.iccid,
          },
          select: {
            iccid: false,
            id: false,
            created_at: false,
            deleted_at: false,
            updated_at: false,
            plan: {
              id: true,
              plan_name: true,
              data: true,
              validity: true,
            },
          },
          relations: {
            wallet_transaction: false,
            plan: true,
          },
        });

        const assignPlan = await this._assignPlanRepo.findOne({
          where: {
            deleted_at: IsNull(),
            wl_account: {
              id: topupOrders.wallet_transaction.wl_id.id,
            },
            plan: {
              id: topupOrders.plan.id,
            },
          },
        });

        order = {
          orderType: 'topup',
          ...topupOrders,
          plan: {
            plan_name: assignPlan.plan.plan_name,
            region: assignPlan.plan.region,
            data: assignPlan.plan.data,
            validity: assignPlan.plan.validity,
            price:
              assignPlan.price_mode == 1
                ? assignPlan.plan.wholesale_price
                : assignPlan.price_mode == 2
                ? assignPlan.plan.retail_price
                : assignPlan.plan.platinum_price,
            singleUse: assignPlan.plan.singleUse,
            test_plan: assignPlan.plan.test_plan,
          },
          active_bundle: active_bundle,
          topup_history: topupHistory,
        };
      }

      // console.log('topup res: ', topupOrders);

      if (topupOrders == null) {
        const esimOrder = await this._ordersRepo.findOne({
          where: {
            order_id: orderId,
            deleted_at: IsNull(),
          },
          relations: {
            order_details: true,
            wl_id: true,
            plan_id: {
              vendor: true,
            },
            transaction: true,
          },
        });

        const assignPlan = await this._assignPlanRepo.findOne({
          where: {
            deleted_at: IsNull(),
            wl_account: {
              id: esimOrder.wl_id.id,
            },
            plan: {
              id: esimOrder.plan_id.id,
            },
          },
        });

        let orderPayload = {
          iccid: esimOrder.order_details.iccid,
          plan_id: {
            plan_name: assignPlan.plan.plan_name,
            region: assignPlan.plan.region,
            data: assignPlan.plan.data,
            validity: assignPlan.plan.validity,
            price:
              assignPlan.price_mode == 1
                ? assignPlan.plan.wholesale_price
                : assignPlan.price_mode == 2
                ? assignPlan.plan.retail_price
                : assignPlan.plan.platinum_price,
            singleUse: assignPlan.plan.singleUse,
            test_plan: assignPlan.plan.test_plan,
          },
          vendorName: esimOrder.plan_id.vendor.name,
        };
        console.log(orderPayload);

        let active_bundle = await this.selectVendor(orderPayload);

        // console.log(active_bundle);

        if (!Object.keys(active_bundle).length) {
          active_bundle = {
            status: 'No active bundle available',
          };
        } else {
          active_bundle = {
            ...active_bundle,
            status: 'Data started',
          };

          if (
            active_bundle?.usage?.remaining_days ==
              parseInt(esimOrder.plan_id.validity) &&
            active_bundle?.usage?.remaining_in_gb ==
              parseInt(esimOrder.plan_id.data)
          ) {
            active_bundle = {
              ...active_bundle,
              status: 'eSIM installed',
            };
          }

          if (active_bundle?.usage?.remaining_in_gb == 0) {
            active_bundle = {
              ...active_bundle,
              status: 'Data finished',
            };
          }

          if (
            active_bundle?.plan == null &&
            active_bundle?.usage?.remaining_days == null
          ) {
            active_bundle = {
              status: 'eSIM not installed',
            };
          }
        }

        const topupHistory = await this._TopupRepo.find({
          where: {
            deleted_at: IsNull(),
            iccid: esimOrder?.order_details?.iccid,
          },
          select: {
            iccid: false,
            id: false,
            created_at: false,
            deleted_at: false,
            updated_at: false,
            plan: {
              id: true,
              plan_name: true,
              data: true,
              validity: true,
            },
          },
          relations: {
            wallet_transaction: false,
            plan: true,
          },
        });

        order = {
          orderType: 'esim',
          ...esimOrder,
          plan_id: {
            plan_name: assignPlan.plan.plan_name,
            region: assignPlan.plan.region,
            data: assignPlan.plan.data,
            validity: assignPlan.plan.validity,
            price:
              assignPlan.price_mode == 1
                ? assignPlan.plan.wholesale_price
                : assignPlan.price_mode == 2
                ? assignPlan.plan.retail_price
                : assignPlan.plan.platinum_price,
            singleUse: assignPlan.plan.singleUse,
            test_plan: assignPlan.plan.test_plan,
          },
          active_bundle: active_bundle,
          topup_history: topupHistory,
        };
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'orders details',
        order,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  // async getAllOrders(req: Request) {

  //     try {

  //         const wl_acount: any = this.jwt.decodeAccessToken(req.headers.authorization);

  //         const allOrders: Orders[] = await this._ordersRepo.find({
  //             where: {
  //                 wl_id: {
  //                     id: wl_acount.id
  //                 }
  //             },
  //             relations: {
  //                 plan_id: true,
  //                 order_details: true,
  //                 transaction: true
  //             },
  //             select: {
  //                 id: true,
  //                 order_id: true,
  //                 status: true,
  //                 // email: true,
  //                 reason: true,
  //                 created_at: true,
  //                 shopify_orderNo: true,
  //                 plan_id: {
  //                     plan_name: true,
  //                     data: true,
  //                     validity: true
  //                 },
  //                 order_details: {
  //                     id: true,
  //                     iccid: true,
  //                     qr_code: true,
  //                     qrcode_url: true,
  //                     data_roaming: true,
  //                     apn: true,
  //                 },
  //                 transaction: {
  //                     debit: true,
  //                     credit: true,
  //                     message: true,
  //                     created_at: true
  //                 }
  //             },
  //             order: {
  //                 id: 'DESC'
  //             },
  //         })

  //         return this.res.generateResponse(HttpStatus.OK, "Order List", allOrders, req)

  //     } catch (error) {

  //         return this.res.generateError(error, req);

  //     }

  // }

  async getAllOrdersByPagination(
    query: PaginationDto,
    body: any,
    req: Request,
  ) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const { page, pageSize, searchStr } = query;

      const allOrders: Orders[] = await this._ordersRepo.find({
        where: [
          { wl_id: { id: wl_acount.id }, order_id: Like(`%${searchStr}%`) },
          { wl_id: { id: wl_acount.id }, status: Like(`%${searchStr}%`) },
          {
            wl_id: { id: wl_acount.id },
            plan_id: { plan_name: Like(`%${searchStr}%`) },
          },
          {
            wl_id: { id: wl_acount.id },
            plan_id: { data: Like(`%${searchStr}%`) },
          },
          {
            wl_id: { id: wl_acount.id },
            plan_id: { validity: Like(`%${searchStr}%`) },
          },
          {
            wl_id: { id: wl_acount.id },
            plan_id: { region: Like(`%${searchStr}%`) },
          },
          {
            wl_id: { id: wl_acount.id },
            order_details: { iccid: Like(`%${searchStr}%`) },
          },
        ],
        relations: {
          plan_id: true,
          order_details: true,
          transaction: true,
        },
        select: {
          id: true,
          order_id: true,
          created_at: true,
          status: true,
          shopify_orderNo: true,
          reason: true,
          plan_id: {
            plan_name: true,
            data: true,
            validity: true,
          },
          order_details: {
            id: true,
            iccid: true,
            qr_code: true,
            qrcode_url: true,
            data_roaming: true,
            apn: true,
          },
          transaction: {
            debit: true,
            credit: true,
            message: true,
            created_at: true,
          },
        },
        order: {
          ...body,
        },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      });

      const count = await this._ordersRepo.count({
        where: [
          { wl_id: { id: wl_acount.id }, order_id: Like(`%${searchStr}%`) },
          { wl_id: { id: wl_acount.id }, status: Like(`%${searchStr}%`) },
          {
            wl_id: { id: wl_acount.id },
            plan_id: { plan_name: Like(`%${searchStr}%`) },
          },
          {
            wl_id: { id: wl_acount.id },
            plan_id: { data: Like(`%${searchStr}%`) },
          },
          {
            wl_id: { id: wl_acount.id },
            plan_id: { validity: Like(`%${searchStr}%`) },
          },
          {
            wl_id: { id: wl_acount.id },
            plan_id: { region: Like(`%${searchStr}%`) },
          },
          {
            wl_id: { id: wl_acount.id },
            order_details: { iccid: Like(`%${searchStr}%`) },
          },
        ],
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      });

      const data = {
        list: allOrders,
        total_count: count,
        page,
        pageSize,
      };

      return this.res.generateResponse(HttpStatus.OK, 'Order List', data, req);
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllOrdersById(order_id: string, req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const Orders: Orders = await this._ordersRepo.findOne({
        where: {
          wl_id: {
            id: wl_acount.id,
          },
          deleted_at: IsNull(),
          order_id: order_id,
        },
        relations: {
          plan_id: true,
          order_details: true,
          transaction: true,
        },
        select: {
          id: true,
          order_id: true,
          status: true,
          shopify_orderNo: true,
          reason: true,
          plan_id: {
            plan_name: true,
            data: true,
            validity: true,
          },
          order_details: {
            id: true,
            iccid: true,
            qr_code: true,
            qrcode_url: true,
            data_roaming: true,
            apn: true,
          },
          transaction: {
            debit: true,
            credit: true,
            message: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Order List',
        Orders,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  isRechargable(vendor: Vendors) {
    let ret = true;
    const { name } = vendor;
    const applicablesVendors = ['esim-go'];
    const find = applicablesVendors.findIndex((_name) =>
      _name.includes(name.toLowerCase()),
    );
    if (find < 0) {
      ret = false;
    }
    return ret;
  }

  async validateEsim(iccid: string, req: Request) {
    try {
      if (process.env.NODE_ENV == 'dev') {
        return this.res.generateResponse(
          HttpStatus.OK,
          'Iccid is validate successfully',
          [],
          req,
        );
      }

      const { data, status } = await this._api.validateEsim(iccid);

      if (status != 200) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid Iccid provided !',
          data,
          req,
        );
      }

      const isAlreadyAssign = await this._activateEsimRepo.findOne({
        where: {
          deleted_at: IsNull(),
          iccid: iccid,
        },
      });

      if (isAlreadyAssign) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'This Iccid is already assigned !',
          data,
          req,
        );
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Iccid is validate successfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async ativateEsim(body: ActivateEsimDto, req: Request) {
    try {
      const { iccid } = body;
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      if (process.env.NODE_ENV != 'dev') {
        const isAlreadyAssign = await this._activateEsimRepo.findOne({
          where: {
            deleted_at: IsNull(),
            iccid: iccid,
          },
        });

        if (isAlreadyAssign) {
          return this.res.generateResponse(
            HttpStatus.BAD_REQUEST,
            'This Iccid is already assigned !',
            null,
            req,
          );
        }
      }

      const ativation = this._activateEsimRepo.create({
        wl_account: wl_acount.id,
        iccid: iccid,
        singleUse: false,
      });

      await this._activateEsimRepo.save(ativation);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Iccid activated!',
        ativation,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async selectVendor(order: any) {
    let ret: any;
    switch (order.vendorName) {
      case 'esim-go':
        ret = await this.getEsimGoIccidDetails(order);
        break;
      case 'keepgo':
        ret = await this.getKeepGoIccidDetails(order);
        break;
      case 'Airalo':
        ret = await this.getAirAloIccidDetails(order);
      default:
        break;
    }
    return ret;
  }

  async getEsimGoIccidDetails(order: any) {
    let active_bundle: any = {};
    const { bundles } = await this._api.getBundleDetail(order.iccid);

    if (bundles.length) {
      const { assignments, name } = bundles[bundles.length - 1];
      const plan = await this._plansRepo.findOne({
        where: {
          package_name: name,
          deleted_at: IsNull(),
        },
        select: {
          id: true,
          plan_name: true,
          countries: true,
          data: true,
          validity: true,
        },
      });

      let end_date: any;
      if (assignments[0]?.endTime) {
        end_date = moment(moment(assignments[0]?.endTime)).diff(
          new Date(),
          'days',
        );
      }

      const queuePackages: any[] = bundles.map((ele: any) => {
        const { name, assignments } = ele;
        if (assignments.find((ele: any) => ele.bundleState == 'queued')) {
          return name;
        }
      });

      const queuePlans = await this._plansRepo.find({
        where: {
          package_name: In(queuePackages),
          deleted_at: IsNull(),
        },
        select: {
          id: true,
          plan_name: true,
          countries: true,
          data: true,
          validity: true,
        },
      });

      active_bundle = {
        plan,
        usage: {
          total_in_gb: this.bytesToGb(assignments[0].initialQuantity),
          remaining_in_gb: this.bytesToGb(assignments[0].remainingQuantity),
          remaining_days: end_date > 0 ? end_date : null,
        },
        queuePlans,
      };
    }
    return active_bundle;
  }

  async getKeepGoIccidDetails(order: any) {
    const { sim_card } = await this._api.getKeepGoBundleDetails(order.iccid);
    const plan = await this._plansRepo.findOne({
      where: {
        package_name: sim_card.bundle_id,
        deleted_at: IsNull(),
      },
      select: {
        id: true,
        plan_name: true,
        countries: true,
        data: true,
        validity: true,
      },
    });

    const active_bundle = {
      plan,
      usage: {
        total_in_gb: this.kilobytesToGb(sim_card.allowed_usage_kb),
        remaining_in_gb: this.kilobytesToGb(sim_card.remaining_usage_kb),
        remaining_days: sim_card.remaining_days,
      },
    };

    return active_bundle;
  }

  async getAirAloIccidDetails(order: any) {
    const { data: Data } = await this._api.getAirAloBundleDetails(order.iccid);

    const {
      plan_id: { plan_name, data, validity },
    } = order;

    let end_date: any;
    if (Data.expired_at) {
      end_date = moment(moment(Data.expired_at)).diff(new Date(), 'days');
    }

    const active_bundle = {
      plan: {
        plan_name,
        data,
        validity,
      },
      usage: {
        total_in_gb: this.megaBytesToGb(Data.total),
        remaining_in_gb: this.megaBytesToGb(Data.remaining),
        remaining_days: end_date > 0 ? end_date : null,
      },
    };

    return active_bundle;
  }

  bytesToGb(bytes: number) {
    const kb = bytes / 1000;
    const mb = kb / 1000;
    const gb = mb / 1000;
    return parseInt(gb.toFixed(0));
  }

  kilobytesToGb(kb: number) {
    const mb = kb / 1000;
    const gb = mb / 1000;
    return parseInt(gb.toFixed(0));
  }

  megaBytesToGb(mb: number) {
    const gb = mb / 1000;
    return parseInt(gb.toFixed(0));
  }
}

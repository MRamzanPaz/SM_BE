/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-empty-function */
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AssignPlanDto,
  AuthenticateWlDto,
  ChangePasswordDto,
  FilterDto,
  OtpDto,
  PurchasePlanDto,
  SerializeWlAcc,
  TransactionDto,
  UnAssignPlanDto,
  UpdateStatusDto,
  UpdateWlAccount,
  createWlAccount,
} from './wl-account.dto';
import { Request } from 'express';
import { ResponseService } from '../shared/services/response.service';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  Equal,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '../shared/services/jwt.service';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { Orders } from 'src/entities/order.entity';
import * as moment from 'moment';
import { NodeMailService } from 'src/mail/node-mail.service';
import { Inventory } from 'src/entities/inventory.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { ApiService } from 'src/shared/services/api.service';
import * as generator from 'otp-generator';
import * as qrcode from 'qrcode';
import { WhereClause } from 'typeorm/query-builder/WhereClause';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import convertor from 'convert-string-to-number';
import { http } from 'winston';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';

@Injectable()
export class WlAccountService {
  constructor(
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @InjectRepository(Wl_Account)
    private readonly _wlAccountRepo: Repository<Wl_Account>,
    @InjectRepository(eSimPlans)
    private readonly _eSimPlansRepo: Repository<eSimPlans>,
    @InjectRepository(AssignPlanToWl)
    private readonly _assignPlanRepo: Repository<AssignPlanToWl>,
    @InjectRepository(Orders) private readonly _ordersRepo: Repository<Orders>,
    @InjectRepository(Inventory)
    private readonly _inventoryRepo: Repository<Inventory>,
    @InjectRepository(OrderDetails)
    private readonly _ordersDetailRepo: Repository<OrderDetails>,
    @InjectRepository(Wallet_Transaction)
    private readonly _walletRepo: Repository<Wallet_Transaction>,
    @InjectRepository(TopUpHistory)
    private readonly _TopupRepo: Repository<TopUpHistory>,
    @InjectRepository(VendorsOrder)
    private readonly _vendorOrdersRepo: Repository<VendorsOrder>,
    @Inject('JWT-SERVICE') private jwt: JwtService,
    private _mailer: NodeMailService,
    @Inject('API-SERVICE') private _api: ApiService,
  ) {}

  async createWlAccount(body: createWlAccount, req: Request) {
    try {
      const { username, email, password } = body;

      const isAccountExsist = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .where('username = :username OR email = :email', { username, email })
        .getOne();

      if (isAccountExsist) {
        return this.res.generateResponse(
          HttpStatus.CONFLICT,
          'Wl account is already created by this email or username',
          null,
          req,
        );
      }

      // generate salt for password
      const salt = await bcrypt.genSalt(10);
      // encrypt password using salt
      const hashPassword = await bcrypt.hash(password, salt);

      const paylaod = {
        ...body,
        password: hashPassword,
      };

      const createWlAcc = this._wlAccountRepo.create(paylaod);
      const newAccount = await this._wlAccountRepo.save(createWlAcc);

      // // Generate access token for wl account
      const serializeAcc = new SerializeWlAcc(newAccount);
      const plainPayload = {
        ...serializeAcc,
      };
      const access_token = this.jwt.createAccessToken(plainPayload);

      // now seed access token
      await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .update()
        .set({
          access_token: access_token,
        })
        .where('id = :id', { id: newAccount.id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Wl account created succefully!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async authenticateWlAccount(body: AuthenticateWlDto, req: Request) {
    try {
      const { username, password } = body;

      const isValidAccount = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .where('username = :username OR email = :email', {
          username,
          email: username,
        })
        .getOne();

      if (!isValidAccount) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Please enter valid email or Username',
          null,
          req,
        );
      }

      // validate account password
      const isValidPass = await bcrypt.compare(
        password,
        isValidAccount.password,
      );
      if (!isValidPass) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Please enter valid password',
          null,
          req,
        );
      }

      // Generate auth token for account

      const tokenPayload = {
        ...new SerializeWlAcc(isValidAccount),
      };

      const token = this.jwt.createAuthToken(tokenPayload);

      // update account user

      await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .update()
        .set({
          auth_token: token,
        })
        .where('id = :id', { id: isValidAccount.id })
        .execute();

      const data = {
        ...new SerializeWlAcc(isValidAccount),
        access_token: isValidAccount.access_token,
        auth_token: token,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'User authenticate successfully',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updateWlAccount(body: UpdateWlAccount, req: Request) {
    try {
      const { username, email, id, password, contact_no } = body;

      // validate account
      const isAlreadUsed = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .where('(username = :username OR email = :email) AND id != :id', {
          username,
          email,
          id,
        })
        .getOne();
      if (isAlreadUsed) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'User not found! or may be user already created by this email or username',
          null,
          req,
        );
      }

      let hashPass: any;
      if (password) {
        // generate new password hash
        const salt = await bcrypt.genSalt(10);
        hashPass = await bcrypt.hash(password, salt);
      }

      // find account to update
      const findOne = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .where('id = :id', { id })
        .getOne();
      if (!findOne) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'User not found,  something went wrong',
          null,
          req,
        );
      }

      // generate new access token
      const Payload = {
        ...new SerializeWlAcc(findOne),
      };
      const accessToken = this.jwt.createAccessToken(Payload);

      // generate new auth token
      const authToken = this.jwt.createAuthToken(Payload);

      let updateAcc: any;
      if (hashPass) {
        // update new account details
        updateAcc = await this._wlAccountRepo
          .createQueryBuilder('Wl_Account')
          .update()
          .set({
            username: username,
            password: hashPass,
            email: email,
            access_token: accessToken,
            contact_no: contact_no,
          })
          .where('id = :id', { id: findOne.id })
          .execute();
      } else {
        // update new account details
        updateAcc = await this._wlAccountRepo
          .createQueryBuilder('Wl_Account')
          .update()
          .set({
            username: username,
            email: email,
            access_token: accessToken,
            contact_no: contact_no,
          })
          .where('id = :id', { id: findOne.id })
          .execute();
      }

      if (!updateAcc) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Something went wrong!, account not found in database',
          [],
          req,
        );
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'account details updated successfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deletedWlAccount(id: string, req: Request) {
    try {
      console.log('delete', id);
      const whitelabel = await this._wlAccountRepo
        .createQueryBuilder()
        .update(Wl_Account)
        .set({
          deleted_at: new Date(),
        })
        .where('id = :id', { id: parseInt(id) })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Account deleted!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async assignPlanToWl(body: AssignPlanDto, req: Request) {
    try {
      const { plan_id, price_mode, wl_id } = body;
  
      const findWLAcc: Wl_Account = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: wl_id,
        },
      });
  
      if (!findWLAcc) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Wl account not exist!',
          null,
          req,
        );
      }
  
      await this._assignPlanRepo.update(
        {
          wl_account: {
            id: wl_id,
          },
        },
        {
          deleted_at: new Date(),
        },
      );
  
      const Plans: eSimPlans[] = await this._eSimPlansRepo.find({
        where: {
          deleted_at: IsNull(),
          id: In(plan_id),
        },
      });
  
      const updateQuery = [];
      Plans.forEach((ele: eSimPlans) => {
        let data = {
          price_mode: price_mode,
          plan: ele,
          wl_account: findWLAcc,
        };
        updateQuery.push(data);
      });
  
      // Log the constructed assign plan data
      console.log('Assign Plan Data:', updateQuery);
  
      await this._assignPlanRepo
        .createQueryBuilder('AssignPlanToWl')
        .insert()
        .values(updateQuery)
        .orIgnore()
        .execute();
  
      return this.res.generateResponse(
        HttpStatus.OK,
        'Plan assigned successfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
  

  async unassignPlanToWl(body: UnAssignPlanDto, req: Request) {
    try {
      const { plan_id, wl_id } = body;

      const isAssigned: AssignPlanToWl = await this._assignPlanRepo
        .createQueryBuilder('AssignPlanToWl')
        .where('deleted_at IS NULL AND plan_id = :plan_id AND wl_id = :wl_id', {
          plan_id,
          wl_id,
        })
        .getOne();

      if (!isAssigned) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'plan not found against this WL account or may be deleted earlier!',
          null,
          req,
        );
      }

      await this._assignPlanRepo
        .createQueryBuilder('AssignPlanToWl')
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('deleted_at IS NULL AND plan_id = :plan_id AND wl_id = :wl_id', {
          plan_id,
          wl_id,
        })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'plan un-assign successfully!',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async purchasePlanForWl(body: PurchasePlanDto, req: Request) {
    try {
      const { wl_id, plan_id } = body;

      const whitelabelAcc = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: wl_id,
        },
      });

      if (!whitelabelAcc) {
        return this.res.generateResponse(
          HttpStatus.NOT_FOUND,
          'Invalid whitelabel!',
          null,
          req,
        );
      }

      const isAssigned = await this._assignPlanRepo.findOne({
        where: {
          deleted_at: IsNull(),
          wl_account: {
            id: wl_id,
            deleted_at: IsNull(),
          },
          plan: {
            id: plan_id,
            deleted_at: IsNull(),
          },
        },
        relations: {
          plan: {
            vendor: true,
          },
        },
      });

      if (!isAssigned) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Plan not found!',
          null,
          req,
        );
      }

      const { plan } = isAssigned;

      const createOrder = this._ordersRepo.create({
        isRetailPrice: isAssigned.isRetailPrice,
        plan_id: plan,
        wl_id: whitelabelAcc,
        systemGenerated: true,
        price_mode: isAssigned.price_mode,
        status: 'PENDING',
      });

      await this._ordersRepo.save(createOrder);

      const ORDER_ID = `SM-${createOrder.id}`;

      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          order_id: `SM-${createOrder.id}`,
        })
        .where('id = :id', { id: createOrder.id })
        .execute();

      if (plan.test_plan) {
        await this._ordersRepo
          .createQueryBuilder('Orders')
          .update()
          .set({
            status: 'COMPLETED',
            order_details: null,
          })
          .where('id = :id', { id: createOrder.id })
          .execute();

        const data: any = {
          order_id: ORDER_ID,
          order_status: 'COMPLETED',
          email: whitelabelAcc.email,
          // email: 'shafiq.paz.agency@gmail.com',
          qr_code: 'LPA:1$RSP-0026.OBERTHUR.NET$1IC3X-U0OT6-QBZHF-HUGAP',
          qrcode_url:
            'https://sandbox.worldroambuddy.com:3001/api/v1/images/8943108161000326169.png',
          apn: 'No APN required',
          data_roaming: 'ON',
          iccid: '8944465400000424256',
          plan: {
            id: plan.id,
            name: plan.plan_name,
            price: isAssigned.isRetailPrice
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
            description: plan.description,
          },
        };

        await this.sendOrderEmail(createOrder, data);

        return this.res.generateResponse(
          HttpStatus.OK,
          `${ORDER_ID} order has been completed .`,
          data,
          req,
        );
      }

      let amount: any =
        isAssigned.price_mode == 1
          ? plan.wholesale_price
          : isAssigned.price_mode == 2
          ? plan.retail_price
          : plan.platinum_price;
      amount = parseFloat(amount);

      const transactionSuccessfull = await this.performWalletTransaction(
        amount,
        ORDER_ID,
        whitelabelAcc,
      );

      if (!transactionSuccessfull) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
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

        await this._ordersRepo
          .createQueryBuilder('Orders')
          .update()
          .set({
            status: 'COMPLETED',
            order_details: OrderDetails,
            transaction: transactionSuccessfull,
          })
          .where('order_id = :order_id', { order_id: ORDER_ID })
          .execute();

        const data: any = {
          order_id: ORDER_ID,
          order_status: 'COMPLETED',
          email: whitelabelAcc.email,
          qr_code: lookUpInventory.qr_code,
          qrcode_url: lookUpInventory.qrcode_url,
          apn: 'No APN required',
          data_roaming: 'ON',
          iccid: lookUpInventory.iccid,
          plan: {
            id: plan.id,
            name: plan.plan_name,
            price:
              isAssigned.price_mode == 1
                ? plan.wholesale_price
                : isAssigned.price_mode == 2
                ? plan.retail_price
                : plan.platinum_price,
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

        await this.sendOrderEmail(createOrder, data);

        return this.res.generateResponse(
          HttpStatus.OK,
          `${ORDER_ID} order has been completed .`,
          data,
          req,
        );
      } else if (plan.plan_type == 2) {
        const order_data = {
          order_id: ORDER_ID,
          email: createOrder.wl_id.email,
          isRetailPrice: createOrder.isRetailPrice,
          transaction: transactionSuccessfull,
          wl_email: createOrder.wl_id.email,
          order: createOrder,
          price_mode: createOrder.price_mode,
        };

        console.log(order_data);

        return this.getEsim(plan, order_data, req);
      } else {
        const error = {
          message: 'Invalid plan type! please provide valid plan type!',
        };
        this.res.generateError(error, req);
      }

      return isAssigned;
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getEsim(plan: eSimPlans, order: any, req: Request) {
    // console.log(plan);

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
  }

  async triggerAPi(
    selectedVendor: number,
    plan: eSimPlans,
    order: any,
    req: Request,
  ) {
    let ret: any;
    console.log(selectedVendor);
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
      default:
        break;
    }

    return ret;
  }

  async Airalo(plan: eSimPlans, order: any, req: Request) {
    const body: any = {
      package_id: plan.package_name,
      quantity: '1',
    };

    console.log('AirAlo ====> ', body);

    const response = await this._api.airaloSubmitOrder(body);

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
        transaction: order.transaction,
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

    const orderDetails = await this._api.eSimGoProcessOrder(body);

    const reference =
      process.env.NODE_ENV == 'prod'
        ? orderDetails.orderReference
        : process.env.ESIM_GO_ORDER_REF;

    let eSim: string = await this.getEsimgoDetails(reference);

    eSim = eSim.replace('\n', ',');
    const tranform = eSim.split(',');

    const { order_id, email, isRetailPrice } = order;

    const QR_CODE: any = `LPA:1$${tranform[7]}$${tranform[6]}`;

    const IMAGE_NAME = `${tranform[5]}.png`;

    await qrcode
      .toFile(`qr-codes/${IMAGE_NAME}`, QR_CODE, {
        errorCorrectionLevel: 'H',
        type: 'png',
      })
      .finally();

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
        transaction: order.transaction,
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
  }

  async getEsimgoDetails(reference: any) {
    let eSim: string = await this._api.eSimGoGetData(reference);

    // log("Esim Data:", eSim)

    const rawData = eSim.replace('\n', ',');
    const tranform = rawData.split(',');

    console.log('ICCID', tranform[5]);
    if (tranform[5]) {
      return eSim;
    } else {
      console.log('Esim Data:', eSim);
      return await this.getEsimgoDetails(reference);
    }
  }

  async keepGo(plan: eSimPlans, order: any, req: Request) {
    const { order_id } = order;

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
    console.log(QR_CODE);
    const IMAGE_NAME = `${response.sim_card.iccid}.png`;

    await qrcode
      .toFile(`qr-codes/${IMAGE_NAME}`, QR_CODE, {
        errorCorrectionLevel: 'H',
        type: 'png',
      })
      .finally();

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
        transaction: order.transaction,
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
  }

  async RedTea(plan: eSimPlans, order: any, req: Request) {
    const { package_name, cost_price } = plan;

    const transaction_id = generator.generate(20, {
      digits: true,
      lowerCaseAlphabets: true,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    let payload: any = {
      transactionId: transaction_id,
      amount: parseInt(cost_price),
      packageInfoList: [
        {
          packageCode: package_name,
          count: 1,
          price: parseInt(cost_price),
        },
      ],
    };

    let response: any = {
      errorCode: null,
      errorMsg: null,
      success: true,
      obj: { orderNo: 'B23071805026292' },
    };

    if (process.env.NODE_ENV != 'dev') {
      console.log('run!!!');
      response = await this._api.redTeaOrderProfile(payload);
    }

    const redTeaOrderNumber = response.obj.orderNo;

    console.log(response.obj.orderNo);

    payload = {
      orderNo: response.obj.orderNo,
      pager: {
        pageNum: 1,
        pageSize: 20,
      },
    };

    response = await this._api.getAllocateProfile(payload);

    const {
      obj: { esimList },
    } = response;
    console.log(esimList[0].packageList);

    payload = {
      qr_code: esimList[0].ac,
      qrcode_url: esimList[0].qrCodeUrl,
      apn: 'No APN required',
      iccid: esimList[0].iccid,
      data_roaming: 'ON',
      email: req.body.email,
    };

    const data = this.generateResponseData(plan, order, payload);

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
        transaction: order.transaction,
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

    const vendorOrder = this._vendorOrdersRepo.create({
      cost_price: mobiMatterOrder.orderLineItem.wholesalePrice,
      iccid: ICCID,
      package: plan.package_name,
      reference: mobiMatterOrder.orderId,
    });

    await this._vendorOrdersRepo.save(vendorOrder);

    const OrderDetails = this._ordersDetailRepo.create({
      apn: APN,
      iccid: ICCID,
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
        transaction: order.transaction,
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
  }

  async flexiroam(plan: eSimPlans, order: any, req: Request) {
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
        transaction: order.transaction,
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

  async performWalletTransaction(
    amount: number,
    order_id: string,
    wl: Wl_Account,
  ) {
    let ret = true;

    const wl_acount: Wl_Account = wl;

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

    let currentBalance: any = isValidAcc.wallet_balance;

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
    const saveTrans = await this._walletRepo.save(createWalletHistory);

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

  async sendOrderEmail(order: Orders, data: any) {
    const emailData = {
      to: order.wl_id.email,
      // to: 'shafiq.paz.agency@gmail.com',
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

  spliteCode(qr_code: string) {
    let splitedCode = qr_code.split('$');
    return splitedCode;
  }

  async getAllWLAssignPlan(_id: string, req: Request) {
    try {
      let findALlAssignPlan = await this._assignPlanRepo.find({
        where: {
          deleted_at: IsNull(),
          wl_account: {
            id: parseInt(_id),
          },
        },
        relations: {
          plan: {
            countries: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Assigned plan list',
        findALlAssignPlan,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllWLAssignPlanForEsimOrder(_id: string, req: Request) {
    try {
      let findALlAssignPlan = await this._assignPlanRepo.find({
        where: {
          deleted_at: IsNull(),
          wl_account: {
            id: parseInt(_id),
          },
          plan: {
            recharge_only: false,
          },
        },
        relations: {
          plan: {
            countries: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Assigned plan list',
        findALlAssignPlan,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async addBalance(body: TransactionDto, req: Request) {
    try {
      const { wl_id, amount } = body;

      const isValidAcc: Wl_Account = await this._wlAccountRepo.findOne({
        where: {
          id: wl_id,
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

      let lastTransactionBalance: any;

      if (!transactions.length) {
        lastTransactionBalance = '0.00';
      } else {
        lastTransactionBalance = transactions[0].balance;
      }

      const payload = {
        message: `System Add balance into ${isValidAcc.username}`,
        credit: amount,
        debit: null,
        wl_id: isValidAcc,
        balance: parseFloat(lastTransactionBalance) + amount,
      };

      const createWalletHistory = this._walletRepo.create(payload);
      await this._walletRepo.save(createWalletHistory);

      let currentBalance: any = isValidAcc.wallet_balance;

      await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .update()
        .set({
          wallet_balance: convertor(currentBalance) + convertor(`${amount}`),
        })
        .where('id = :id', { id: wl_id })
        .execute();

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

  async DeductBalance(body: TransactionDto, req: Request) {
    try {
      const { wl_id, amount } = body;

      const isValidAcc: Wl_Account = await this._wlAccountRepo.findOne({
        where: {
          id: wl_id,
          deleted_at: IsNull(),
        },
      });

      if (!isValidAcc) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'WL account ID is invalid or account may be deleted!',
          null,
          req,
        );
      }

      let Balance: any = isValidAcc.wallet_balance;
      Balance = convertor(Balance);
      if (Balance < amount) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Given amount is greater than current balance!',
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
        message: `System deduct balance from ${isValidAcc.username}`,
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
          wallet_balance: convertor(currentBalance) - convertor(`${amount}`),
        })
        .where('id = :id', { id: wl_id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Balance deducted from wallet successfully!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllTransactions(req: Request) {
    try {
      const allTransactions = await this._walletRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          wl_id: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Transaction List',
        allTransactions,
        req,
      );
    } catch (error) {
      console.log(error);
      return this.res.generateError(error, req);
    }
  }

  async resetTransaction(req: Request) {
    try {
      const whiteLabels = await this._wlAccountRepo.find({
        where: {
          deleted_at: IsNull(),
        },
      });

      const dataSet: Wallet_Transaction[] = [];

      for (let index = 0; index < whiteLabels.length; index++) {
        const firstDebit = await this._walletRepo.findOne({
          where: {
            deleted_at: IsNull(),
            debit: IsNull(),
            wl_id: {
              id: whiteLabels[index].id,
            },
          },
        });

        if (firstDebit) dataSet.push(firstDebit);
      }

      for (let index = 0; index < dataSet.length; index++) {
        await this._walletRepo
          .createQueryBuilder()
          .update()
          .set({
            balance: dataSet[index].credit,
          })
          .where(`deleted_at IS NULL AND id = :id`, { id: dataSet[index].id })
          .execute();
      }

      for (let index = 0; index < whiteLabels.length; index++) {
        const transactions = await this._walletRepo.find({
          where: {
            deleted_at: IsNull(),
            wl_id: {
              id: whiteLabels[index].id,
            },
          },
        });

        // console.log(transactions);

        for (let index = 1; index < transactions.length; index++) {
          const prevTrans = await this._walletRepo.findOne({
            where: {
              deleted_at: IsNull(),
              id: transactions[index - 1].id,
            },
          });
          const currentTrans = transactions[index];

          if (currentTrans.credit) {
            await this._walletRepo
              .createQueryBuilder()
              .update()
              .set({
                balance:
                  convertor(prevTrans.balance) + convertor(currentTrans.credit),
              })
              .where('deleted_at IS NULL AND id = :id', { id: currentTrans.id })
              .execute();
          }
          if (currentTrans.debit) {
            await this._walletRepo
              .createQueryBuilder()
              .update()
              .set({
                balance:
                  convertor(prevTrans.balance) - convertor(currentTrans.debit),
              })
              .where('deleted_at IS NULL AND id = :id', { id: currentTrans.id })
              .execute();
          }
        }
      }

      return dataSet;
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllTransactionByWlId(id: string, req: Request) {
    try {
      const allTransactionByID = await this._walletRepo.find({
        where: {
          deleted_at: IsNull(),
          wl_id: {
            id: parseInt(id),
          },
        },
        relations: {
          wl_id: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Transaction List',
        allTransactionByID,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllWlAccount(req: Request) {
    try {
      const WL_Accounts = await this._wlAccountRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        select: {
          id: true,
          username: true,
          password: false,
          email: true,
          access_token: true,
          wallet_balance: true,
          contact_no: true,
          active: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Wl Account List',
        WL_Accounts,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updateStatus(body: UpdateStatusDto, req: Request) {
    try {
      const { wl_id, active } = body;

      const whitelabel = await this._wlAccountRepo
        .createQueryBuilder()
        .update(Wl_Account)
        .set({
          active: active,
        })
        .where('deleted_at IS NULL AND id = :id', { id: wl_id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'status updated!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllTransactionByFilter(query: FilterDto, req: Request) {
    try {
      const {
        whitelabel_id,
        start_date,
        end_date,
        filter_type,
        balanceCalculation,
      } = query;

      let whereConditions: any = {
        deleted_at: IsNull(),
      };

      if (whitelabel_id != '0') {
        whereConditions = {
          ...whereConditions,
          wl_id: {
            id: parseInt(whitelabel_id),
          },
        };
      }

      if (start_date && end_date) {
        whereConditions = {
          ...whereConditions,
          created_at: Between(start_date, end_date),
        };
      }

      const data = await this.selectProcessByType(filter_type, whereConditions);

      return data;
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async selectProcessByType(filter_type: any, whereConditions: any) {
    let ret: any = {
      totalCredit: '00.00',
      totalDebit: '00.00',
      list: [],
    };

    switch (filter_type) {
      case 'ALL':
        ret = await this.getAlltrans(whereConditions);
        break;
      case 'ORDER':
        ret = await this.getAllOrderTrans(whereConditions);
        break;
      case 'RECHARGE':
        ret = await this.getAllRechargeTrans(whereConditions);
        break;
      default:
        break;
    }

    return ret;
  }

  async getAllRechargeTrans(whereConditions: any) {
    const topupTrans = await this._TopupRepo.find({
      where: {
        wallet_transaction: {
          ...whereConditions,
        },
      },
      relations: {
        wallet_transaction: true,
      },
    });

    const transactionsIds = topupTrans.map((ele) => ele.wallet_transaction.id);

    const transactions = await this._walletRepo.find({
      where: {
        id: In(transactionsIds),
      },
      relations: {
        wl_id: true,
      },
    });

    const total = await this._walletRepo
      .createQueryBuilder('wallet_trans')
      .where({
        id: In(transactionsIds),
      })
      .select('SUM(wallet_trans.credit)', 'totalCredit')
      .addSelect('SUM(wallet_trans.debit)', 'totalDebit')
      .getRawOne();

    const data = {
      totalCredit: total.totalCredit ? total.totalCredit : '00.00',
      totalDebit: total.totalDebit ? total.totalDebit : '00.00',
      list: transactions,
    };

    return data;
  }

  async getAllOrderTrans(whereConditions: any) {
    const orderTrans = await this._ordersRepo.find({
      where: {
        transaction: {
          ...whereConditions,
        },
      },
      relations: {
        transaction: true,
      },
    });

    const transactionsIds = orderTrans.map((ele) => ele.transaction.id);

    const transactions = await this._walletRepo.find({
      where: {
        id: In(transactionsIds),
      },
      relations: {
        wl_id: true,
      },
    });

    const total = await this._walletRepo
      .createQueryBuilder('wallet_trans')
      .where({
        id: In(transactionsIds),
      })
      .select('SUM(wallet_trans.credit)', 'totalCredit')
      .addSelect('SUM(wallet_trans.debit)', 'totalDebit')
      .getRawOne();

    const data = {
      totalCredit: total.totalCredit ? total.totalCredit : '00.00',
      totalDebit: total.totalDebit ? total.totalDebit : '00.00',
      list: transactions,
    };

    return data;
  }

  async getAlltrans(whereConditions: any) {
    const transactions = await this._walletRepo.find({
      where: whereConditions,
      relations: {
        wl_id: true,
      },
    });

    const total = await this._walletRepo
      .createQueryBuilder('wallet_trans')
      .where({
        ...whereConditions,
      })
      .select('SUM(wallet_trans.credit)', 'totalCredit')
      .addSelect('SUM(wallet_trans.debit)', 'totalDebit')
      .getRawOne();

    const data = {
      totalCredit: total.totalCredit ? total.totalCredit : '00.00',
      totalDebit: total.totalDebit ? total.totalDebit : '00.00',
      list: transactions,
    };

    return data;
  }

  async getSpecificTransactionDetails(id: string, req: Request) {
    try {
      const orderTransaction = await this._ordersRepo.findOne({
        where: {
          transaction: {
            id: parseInt(id),
          },
        },
        relations: {
          plan_id: true,
          order_details: true,
          transaction: true,
        },
      });

      console.log(orderTransaction);

      if (orderTransaction) {
        const data = {
          type: 'ORDER',
          data: orderTransaction,
        };

        return this.res.generateResponse(
          HttpStatus.OK,
          'Transaction Details!',
          data,
          req,
        );
      }

      const rechargeTransaction = await this._TopupRepo.findOne({
        where: {
          wallet_transaction: {
            id: parseInt(id),
          },
        },
        relations: {
          plan: true,
        },
      });

      if (rechargeTransaction) {
        const data = {
          type: 'RECHARGE',
          data: rechargeTransaction,
        };

        return this.res.generateResponse(
          HttpStatus.OK,
          'Transaction Details!',
          data,
          req,
        );
      }

      const walletTransaction = await this._walletRepo.findOne({
        where: {
          id: parseInt(id),
        },
      });

      const data = {
        type: 'DEFAULT',
        data: walletTransaction,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Transaction Details!',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllUnassignPlans(wl_id: string, req: Request) {
    try {
      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: parseInt(wl_id),
        },
      });

      if (!whitelabel) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid whitelabel ID',
          null,
          req,
        );
      }

      const allplans = await this._eSimPlansRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          countries: true,
        },
      });

      const unAssignPlans: eSimPlans[] = [];

      for (const plan of allplans) {
        const isAssign = await this._assignPlanRepo.findOne({
          where: {
            deleted_at: IsNull(),
            plan: {
              deleted_at: IsNull(),
              id: plan.id,
            },
            wl_account: {
              id: whitelabel.id,
            },
          },
        });

        if (!isAssign) {
          unAssignPlans.push(plan);
        }
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'All un-assign plans!',
        unAssignPlans,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllWholeSaleAssignPlans(wl_id: string, req: Request) {
    try {
      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: parseInt(wl_id),
        },
      });

      if (!whitelabel) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid whitelabel ID',
          null,
          req,
        );
      }

      const AllWholeSaleWlPlans = await this._assignPlanRepo.find({
        where: {
          deleted_at: IsNull(),
          price_mode: 1,
          wl_account: {
            id: whitelabel.id,
          },
        },
        relations: {
          plan: {
            countries: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'All wholesale plans',
        AllWholeSaleWlPlans,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllRetailAssignPlans(wl_id: string, req: Request) {
    try {
      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: parseInt(wl_id),
        },
      });

      if (!whitelabel) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid whitelabel ID',
          null,
          req,
        );
      }

      const AllRetailWlPlans = await this._assignPlanRepo.find({
        where: {
          deleted_at: IsNull(),
          price_mode: 2,
          wl_account: {
            id: whitelabel.id,
          },
        },
        relations: {
          plan: {
            countries: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'All retail plans',
        AllRetailWlPlans,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllPlatinumAssignPlans(wl_id: string, req: Request) {
    try {
      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: parseInt(wl_id),
        },
      });

      if (!whitelabel) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid whitelabel ID',
          null,
          req,
        );
      }

      const AllRetailWlPlans = await this._assignPlanRepo.find({
        where: {
          deleted_at: IsNull(),
          price_mode: 3,
          wl_account: {
            id: whitelabel.id,
          },
        },
        relations: {
          plan: {
            countries: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'All platinum plans',
        AllRetailWlPlans,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async setSelectedPlansToWholeSalePrice(body: AssignPlanDto, req: Request) {
    try {
      const { plan_id, wl_id, price_mode, setUnAssign } = body;

      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: wl_id,
        },
      });

      if (!whitelabel) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid whitelabel ID',
          null,
          req,
        );
      }

      const deleteSelectedPlans = await this._assignPlanRepo
        .createQueryBuilder()
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('plan_id IN(:...plan_id) AND wl_id = :wl_id', {
          plan_id: plan_id,
          wl_id: whitelabel.id,
        })
        .execute();

      if (!setUnAssign) {
        console.log(setUnAssign);
        const Plans: eSimPlans[] = await this._eSimPlansRepo.find({
          where: {
            deleted_at: IsNull(),
            id: In(plan_id),
          },
        });

        console.log(Plans);

        const updateQuery = [];
        Plans.forEach((ele: eSimPlans) => {
          let data = {
            price_mode: price_mode,
            plan: ele,
            wl_account: whitelabel,
          };
          updateQuery.push(data);
        });

        await this._assignPlanRepo
          .createQueryBuilder('AssignPlanToWl')
          .insert()
          .values(updateQuery)
          .orIgnore()
          .execute();
      }
      return this.res.generateResponse(
        HttpStatus.OK,
        'Plan assigned successfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  //         Wl Account change password functionaility

  async changePassword(body: ChangePasswordDto, req: Request) {
    try {
      const { username, current_password, new_password, confirm_password } =
        body;

      // Check User is valide or not

      const isValidEmailorUsername = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .where('username = :username OR email = :email', {
          username,
          email: username,
        })
        .getOne();

      //    if not valide return error message

      if (!isValidEmailorUsername)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid Email or Username',
          null,
          req,
        );

      const { password: hashPassword } = isValidEmailorUsername;

      // check password is valid or not
      const isValidPassword = await bcrypt.compare(
        current_password,
        hashPassword,
      );

      //    if not valide return error message

      if (!isValidPassword)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'please enter a valid password',
          null,
          req,
        );

      // if new password and current password is not matched return error message

      if (new_password != confirm_password)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'New password and Confirm Password does not match',
          null,
          req,
        );

      /// Hash new password

      const salt = await bcrypt.genSalt(10);
      const HashedPassword = await bcrypt.hash(new_password, salt);

      // check current password and new password is same return error
      if (current_password == new_password)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Current Password and New Password can not be same',
          [],
          req,
        );

      // Update new password is Database
      const UpdatePassword = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .update()
        .set({
          password: HashedPassword,
        })
        .where('username = :username OR email = :username', { username })
        .execute();

      // if password not update return error message
      if (!UpdatePassword.affected)
        throw new Error(
          'user not able to authenticate, internal server issues',
        );

      /// Return success message
      return this.res.generateResponse(
        HttpStatus.OK,
        'Password Changed Successfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async GenerateOtp(username: string, req: Request) {
    try {
      const isValidUsernameOrEmail = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .where('username = :username OR email = :email', {
          username,
          email: username,
        })
        .getOne();

      if (!isValidUsernameOrEmail)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid Username OR email',
          [],
          req,
        );

      const { email } = isValidUsernameOrEmail;

      // Generate a secret key
      const otp_code = generator.generate(6, {
        digits: true,
        lowerCaseAlphabets: true,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      /// Add Expiration Time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + 300); // Set expiration time 5 minutes from now

      // Add OTP_TOKEN TO DB
      const addTokenToDatabase = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .update()
        .set({
          otp_token: otp_code,
          expires_at: expiresAt,
        })
        .where('email = :email', { email })
        .execute();

      if (!addTokenToDatabase.affected)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Something went wrong',
          [],
          req,
        );

      this._mailer.sendOTPEmail(email, otp_code);
      return this.res.generateResponse(
        HttpStatus.OK,
        `Otp Send to this email: ${email}`,
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async VerifyOtp(body: OtpDto, req: Request) {
    try {
      const { username, otp, new_password } = body;

      // check wl-account usnig username or email address
      const isValidUsernameOrEmail = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .where('username = :username OR email = :username', {
          username,
          email: username,
        })
        .getOne();

      // if wl-account is not found throw error
      if (!isValidUsernameOrEmail)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid username or email',
          [],
          req,
        );

      // Get wl-account email
      const { otp_token, expires_at, password, id } = isValidUsernameOrEmail;

      // check otp is valid or not
      if (otp_token != otp)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid One time password',
          [],
          req,
        );

      const changetoLocalTime = expires_at.toLocaleTimeString();
      const currentTime = new Date().toLocaleTimeString();

      if (changetoLocalTime < currentTime)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Otp is expire',
          [],
          req,
        );

      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(new_password, salt);
      const IsPasswordMatched = await bcrypt.compare(new_password, password);

      // Check current password and new password is same or not
      if (IsPasswordMatched)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'New password must be different from the old password',
          [],
          req,
        );

      const updateWhiteLabelPassword = await this._wlAccountRepo
        .createQueryBuilder('Wl_Account')
        .update()
        .set({
          password: hashPassword,
          otp_token: null,
        })
        .where('id = :id', { id })
        .execute();
      if (!updateWhiteLabelPassword.affected)
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'user not able to authenticate, internal server issues',
          [],
          req,
        );

      /// Return success message
      return this.res.generateResponse(
        HttpStatus.OK,
        'Password Changed Successfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

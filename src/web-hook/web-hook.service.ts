import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiService } from 'src/shared/services/api.service';
import { ResponseService } from 'src/shared/services/response.service';
import { WebHookEsimGoDto, shopifyDto } from './web-hook.dto';
import { Request } from 'express';
import { NodeMailService } from 'src/mail/node-mail.service';
import * as moment from 'moment';
import { JwtService } from 'src/shared/services/jwt.service';
import { InjectRepository } from '@nestjs/typeorm';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { IsNull, Repository } from 'typeorm';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import { Orders } from 'src/entities/order.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import * as generator from 'otp-generator';
import * as qrcode from 'qrcode';
import * as getRawBody from 'raw-body';
import * as crypto from 'crypto';
import { ShopifyWebHooks } from 'src/entities/shopifyWebHook.entity';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';

@Injectable()
export class WebHookService {
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
    @InjectRepository(ShopifyWebHooks)
    private readonly _ShopifyWebhookRepo: Repository<ShopifyWebHooks>,
    @InjectRepository(VendorsOrder)
    private readonly _vendorOrdersRepo: Repository<VendorsOrder>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
    @Inject('JWT-SERVICE') private jwt: JwtService,

    private _mailer: NodeMailService,
  ) {}

  async sendEsimNotification(body: WebHookEsimGoDto, req: Request) {
    console.log(body);
    try {
      const { iccid, bundle } = body;

      const usedData = bundle.initialQuantity - bundle.remainingQuantity;
      let usagePercentage: number | any =
        (usedData * 100) / bundle.initialQuantity;

      const remainingGB = (bundle.remainingQuantity / 1024).toFixed(2);
      const totalGB = (bundle.initialQuantity / 1024).toFixed(2);

      usagePercentage = usagePercentage.toFixed(0);
      if (isNaN(usagePercentage)) {
        usagePercentage = 0;
      }

      const whitelabel = await this._ordersRepo.findOne({
        where: {
          deleted_at: IsNull(),
          order_details: {
            iccid: iccid,
          },
        },
        relations: {
          order_details: true,
          wl_id: true,
        },
      });

      let message = '';

      let message1 = `Dear Customer, you've consumed ${usagePercentage}% already.
                \n
                ICCID: ${whitelabel.order_details.iccid}
                \n`;
      let message2 =
        whitelabel.wl_id.id == 2
          ? `You can top up by logging into the site: https://travelnet.world/account/login\n`
          : '';

      let message3 = `Safe travels\n`;

      message = message1 + message2 + message3;

      const payload = {
        message: message,
        from: '',
      };

      const mailerObj = {
        to: whitelabel.wl_id.email,
        wl_name: whitelabel.wl_id.username,
        message: message,
      };

      // send email to customer
      await this._mailer.sendUsageEmail(mailerObj);

      // send mobile notification on eSim channal
      await this._api.eSimGoSendNotification(iccid, payload);

      return this.res.generateResponse(HttpStatus.OK, 'SMS sent', [], req);
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async sendRedTeaNotification(body: any, req: Request) {
    try {
      const {
        content: { iccid, totalVolume, orderUsage, remain },
        notifyType,
      } = body;

      if (notifyType == 'DATA_USAGE') {
        const usedData = totalVolume - remain;

        let usagePercentage: number | any = (usedData * 100) / totalVolume;

        const remainingGB = this.bytesToGb(remain);

        const totalGB = this.bytesToGb(totalVolume);

        usagePercentage = usagePercentage.toFixed(0);
        if (isNaN(usagePercentage)) {
          usagePercentage = 0;
        }

        const whitelabel = await this._ordersRepo.findOne({
          where: {
            deleted_at: IsNull(),
            order_details: {
              iccid: iccid,
            },
          },
          relations: {
            order_details: true,
            wl_id: true,
          },
        });

        let message = '';

        let message1 = `Dear Customer, you've consumed ${usagePercentage}% already.
                \n
                ICCID: ${whitelabel.order_details.iccid}
                \n`;
        let message2 =
          whitelabel.wl_id.id == 2
            ? `You can top up by logging into the site: https://travelnet.world/account/login\n`
            : '';

        let message3 = `Safe travels\n`;

        message = message1 + message2 + message3;

        const mailerObj = {
          to: whitelabel.wl_id.email,
          wl_name: whitelabel.wl_id.username,
          message: message,
        };

        // send email to customer
        await this._mailer.sendUsageEmail(mailerObj);

        return this.res.generateResponse(HttpStatus.OK, 'SMS sent', [], req);
      }

      return 'ok';
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async shopifyWebHookAction(access_id: string, body: any, req: Request) {
    try {
      console.log('webhook Body ==========================');
      console.log(body);

      console.log('PROPERTIES ==> ', body.line_items[0].properties);

      body.line_items[0].properties.forEach((element) => {
        console.log(element);
      });

      if (body.financial_status == 'paid') {
        const isValidWebhook = await this._ShopifyWebhookRepo.findOne({
          where: {
            deleted_at: IsNull(),
            access_id: access_id,
            whitelabel: {
              active: true,
              deleted_at: IsNull(),
            },
          },
          relations: {
            whitelabel: true,
          },
        });

        if (!isValidWebhook) {
          return this.res.generateResponse(
            HttpStatus.BAD_REQUEST,
            'Invalid access_id',
            null,
            req,
          );
        }

        const isCompleted = await this._ordersRepo.findOne({
          where: {
            deleted_at: IsNull(),
            shopify_orderNo: body.order_number,
            wl_id: {
              id: isValidWebhook.whitelabel.id,
            },
          },
        });

        if (isCompleted) {
          return this.res.generateResponse(
            HttpStatus.BAD_REQUEST,
            'Invalid order number',
            null,
            req,
          );
        }

        const { whitelabel } = isValidWebhook;

        const data: any = {
          wl_accout: whitelabel,
          plan_id: body.line_items[0].sku,
          customer_email: body.customer.email,
          shopify_orderNo: body.order_number,
        };

        console.log('run 0');
        const response = await this.completeOrder(data, req);

        return this.res.generateResponse(
          HttpStatus.OK,
          'Order data',
          response,
          req,
        );
      } else {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'invalid payment status',
          null,
          req,
        );
      }
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async completeOrder(
    data: {
      wl_accout: Wl_Account;
      plan_id: string;
      customer_email: string;
      shopify_orderNo: number;
    },
    req: Request,
  ) {
    const { wl_accout, plan_id, customer_email, shopify_orderNo } = data;

    let responseData: any;

    const whitelabelAcc = await this._wlAccountRepo.findOne({
      where: {
        deleted_at: IsNull(),
        id: wl_accout.id,
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
          id: wl_accout.id,
          deleted_at: IsNull(),
        },
        plan: {
          id: parseInt(plan_id),
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

    const createOrder = this._ordersRepo.create({
      isRetailPrice: isAssigned.isRetailPrice,
      plan_id: isAssigned.plan,
      wl_id: whitelabelAcc,
      systemGenerated: false,
      status: 'PENDING',
      shopify_orderNo: `${shopify_orderNo}`,
      price_mode: isAssigned.price_mode,
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

    console.log('ORDERID: ', createOrder.id);

    const findOrder = await this._ordersRepo.findOne({
      where: {
        deleted_at: IsNull(),
        id: createOrder.id,
      },
      relations: {
        plan_id: {
          vendor: true,
        },
        wl_id: true,
      },
    });

    console.log('ORDER: ', findOrder);

    if (findOrder.plan_id.test_plan) {
      await this._ordersRepo
        .createQueryBuilder('Orders')
        .update()
        .set({
          status: 'COMPLETED',
          order_details: null,
        })
        .where('id = :id', { id: createOrder.id })
        .execute();

      responseData = {
        order_id: ORDER_ID,
        order_status: 'COMPLETED',
        email: [whitelabelAcc.email, customer_email],
        qr_code: 'LPA:1$RSP-0026.OBERTHUR.NET$1IC3X-U0OT6-QBZHF-HUGAP',
        qrcode_url:
          'https://sandbox.worldroambuddy.com:3001/api/v1/images/8943108161000326169.png',
        apn: 'No APN required',
        data_roaming: 'ON',
        iccid: '8944465400000424256',
        plan: {
          id: findOrder.plan_id.id,
          name: findOrder.plan_id.plan_name,
          price: isAssigned.isRetailPrice
            ? findOrder.plan_id.retail_price
            : findOrder.plan_id.wholesale_price,
          data: findOrder.plan_id.data,
          validity: findOrder.plan_id.validity,
          region: findOrder.plan_id.region,
          planType:
            findOrder.plan_id.vendor.inventory_type == 1
              ? 'E-SIM'
              : 'PHYSICAL-SIM',
          countries: findOrder.plan_id.countries,
          test_plan: findOrder.plan_id.test_plan,
          signle_use: findOrder.plan_id.singleUse,
          global_plan: findOrder.plan_id.global_plan,
        },
      };
    } else {
      let amount: any =
        isAssigned.price_mode == 1
          ? findOrder.plan_id.wholesale_price
          : isAssigned.price_mode == 2
          ? findOrder.plan_id.retail_price
          : findOrder.plan_id.platinum_price;
      amount = parseFloat(amount);

      const transactionSuccessfull = await this.performWalletTransaction(
        amount,
        findOrder,
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

      if (findOrder.plan_id.plan_type == 1) {
        const lookUpInventory: Inventory = await this._inventoryRepo.findOne({
          where: {
            package_name: findOrder.plan_id.package_name,
            deleted_at: IsNull(),
            status: 'IN-STOCK',
            vendor: {
              id: findOrder.plan_id.vendor.id,
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
            price_mode: isAssigned.price_mode,
          })
          .where('order_id = :order_id', { order_id: ORDER_ID })
          .execute();

        responseData = {
          order_id: ORDER_ID,
          order_status: 'COMPLETED',
          email: [whitelabelAcc.email, customer_email],
          qr_code: lookUpInventory.qr_code,
          qrcode_url: lookUpInventory.qrcode_url,
          apn: 'No APN required',
          data_roaming: 'ON',
          iccid: lookUpInventory.iccid,
          plan: {
            id: findOrder.plan_id.id,
            name: findOrder.plan_id.plan_name,
            price:
              isAssigned.price_mode == 1
                ? findOrder.plan_id.wholesale_price
                : isAssigned.price_mode == 2
                ? findOrder.plan_id.retail_price
                : findOrder.plan_id.platinum_price,
            data: findOrder.plan_id.data,
            validity: findOrder.plan_id.validity,
            region: findOrder.plan_id.region,
            planType:
              findOrder.plan_id.vendor.inventory_type == 1
                ? 'E-SIM'
                : 'PHYSICAL-SIM',
            countries: findOrder.plan_id.countries,
            test_plan: findOrder.plan_id.test_plan,
            signle_use: findOrder.plan_id.singleUse,
            global_plan: findOrder.plan_id.global_plan,
          },
        };
      } else if (findOrder.plan_id.plan_type == 2) {
        console.log('run 1');
        const ESIM = await this.getEsim(findOrder.plan_id);

        responseData = this.generateResponseData(findOrder, ESIM);
        responseData = {
          ...responseData,
          vendorOrder: ESIM.vendorOrder,
        };
      } else {
        const error = {
          message: 'Invalid plan type! please provide valid plan type!',
        };
        this.res.generateError(error, req);
      }

      const vendorOrder: any = this._vendorOrdersRepo.create({
        ...responseData.vendorOrder,
      });

      await this._vendorOrdersRepo.save(vendorOrder);

      if (findOrder.plan_id.vendor.id == 1) {
        this.setAiraloNetPrice(vendorOrder);
      }

      const OrderDetails = this._ordersDetailRepo.create({
        apn: responseData.apn,
        iccid: responseData.iccid,
        qr_code: responseData.qr_code,
        qrcode_url: responseData.qrcode_url,
        data_roaming: 'ON',
        package_name: findOrder.plan_id.package_name,
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
          price_mode: isAssigned.price_mode,
        })
        .where('order_id = :order_id', { order_id: ORDER_ID })
        .execute();

      // send email to WL

      await this.sendOrderEmailWL(findOrder, responseData, wl_accout.email);

      // send email to Customer

      const ORDER = {
        ...findOrder,
        order_id: shopify_orderNo,
        wl_accout: wl_accout,
      };

      await this.sendOrderEmailTOCustomer(ORDER, responseData, customer_email);

      return responseData;
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

  async sendOrderEmailWL(order: Orders, data: any, to: string) {
    const emailData = {
      to: to,
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

    console.log(emailData);

    await this._mailer.sendOrderEmail(emailData);
  }

  async sendOrderEmailTOCustomer(order: any, data: any, to: string) {
    const emailData = {
      to: to,
      from: order.wl_accout.email,
      // from: 'dev@roambuddy.world',
      customer_name: order.wl_id.username,
      order_id: order.order_id,
      order_date: moment(order.created_at).format('MMMM Do YYYY'),
      iccid: data?.iccid,
      apn: data?.apn,
      dataRoaming: data?.data_roaming,
      email: to,
      packageData: data.plan.data,
      packageValidity: data.plan.validity,
      planName: order.plan_id.plan_name,
      payment: data.plan.price,
      iosAddress: this.spliteCode(data?.qr_code)[1],
      iosURL: this.spliteCode(data?.qr_code)[2],
      qrCodeString: data?.qr_code,
      qr_url: data?.qrcode_url,
    };
    console.log('wl id:', order.wl_accout.id);
    if (order.wl_accout.id == 2) {
      await this._mailer.sendOrderEmailToTravelNetCustomer(emailData);
    } else if (order.wl_accout.id == 5) {
      await this._mailer.sendOrderEmailToViajePhoneCustomer(emailData);
    } else {
      await this._mailer.sendOrderEmailToCustomer(emailData);
    }
  }

  async performWalletTransaction(
    amount: number,
    order: Orders,
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
      message: `System deduct balance from ${isValidAcc.username} by completed order ${order.order_id}`,
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
    let splitedCode = qr_code.split('$');
    return splitedCode;
  }

  async getEsim(plan: eSimPlans) {
    // console.log("================>getEsim: ", order);

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

    // console.log("SELECTED VENDOR", selectedVendor)

    return await this.triggerAPi(selectedVendor, plan);
  }

  async triggerAPi(selectedVendor: number, plan: eSimPlans) {
    let ret: any;

    switch (selectedVendor) {
      case 0:
        ret = await this.Airalo(plan);
        break;
      case 1:
        ret = await this.eSimGO(plan);
        break;
      case 2:
        ret = await this.keepGo(plan);
        break;
      case 3:
        ret = await this.RedTea(plan);
        break;
      case 4:
        ret = await this.mobiMatter(plan);
        break;
      case 5:
        ret = await this.flexiroam(plan);
      default:
        break;
    }

    return ret;
  }

  async Airalo(plan: eSimPlans) {
    const body: any = {
      package_id: plan.package_name,
      quantity: '1',
    };

    const response = await this._api.airaloSubmitOrder(body);

    const payload = {
      qr_code: response.data.sims[0].qrcode,
      qrcode_url: response.data.sims[0].qrcode_url,
      apn: response.data.sims[0].apn_value,
      iccid: response.data.sims[0].iccid,
      data_roaming: response.data.sims[0].is_roaming ? 'ON' : 'OFF',
      vendorOrder: {
        cost_price: response.data.price,
        iccid: response.data.sims[0].iccid,
        package: plan.package_name,
        reference: response.data.id,
      },
    };

    return payload;
  }

  async eSimGO(plan: eSimPlans) {
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

    const QR_CODE: any = `LPA:1$${tranform[7]}$${tranform[6]}`;

    const IMAGE_NAME = `${tranform[5]}.png`;

    await qrcode
      .toFile(`qr-codes/${IMAGE_NAME}`, QR_CODE, {
        errorCorrectionLevel: 'H',
        type: 'png',
      })
      .finally();

    const payload = {
      qr_code: QR_CODE,
      apn: 'No APN required',
      iccid: tranform[5],
      data_roaming: 'ON',
      qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
      vendorOrder: {
        cost_price: orderDetails.order[0].pricePerUnit,
        iccid: tranform[5],
        package: plan.package_name,
        reference:
          process.env.NODE_ENV == 'prod'
            ? orderDetails.orderReference
            : process.env.ESIM_GO_ORDER_REF,
      },
    };

    return payload;
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

  async keepGo(plan: eSimPlans) {
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

    let keepGoBundle = await this._api.getKeepGoBundle(plan.package_name);
    keepGoBundle = keepGoBundle.bundle.refills.find((ele: any) => {
      if (ele.amount_mb == parseInt(plan.data) * 1024) {
        return ele;
      }
    });

    const payload = {
      qr_code: response.sim_card.lpa_code,
      apn: 'No APN required',
      iccid: response.sim_card.iccid,
      data_roaming: 'ON',
      qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
      vendorOrder: {
        cost_price: keepGoBundle.price_usd,
        iccid: response.sim_card.iccid,
        package: plan.package_name,
        reference: 'KEEP-GO',
      },
    };

    return payload;
  }

  async RedTea(plan: eSimPlans) {
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

    const {
      obj: { esimList },
    } = response;

    const _package = await this.getRedTeaDataPackage(plan);

    payload = {
      qr_code: esimList[0].ac,
      qrcode_url: esimList[0].qrCodeUrl,
      apn: 'No APN required',
      iccid: esimList[0].iccid,
      data_roaming: 'ON',
      vendorOrder: {
        cost_price: _package.obj.packageList[0].price / 10000,
        iccid: esimList[0].iccid,
        package: plan.package_name,
        reference: redTeaOrderNumber,
      },
    };

    return payload;
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

  async mobiMatter(plan: eSimPlans) {
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
      apn: 'No APN required',
      iccid: ICCID,
      data_roaming: APN,
      vendorOrder: {
        cost_price: mobiMatterOrder.orderLineItem.wholesalePrice,
        iccid: ICCID,
        package: plan.package_name,
        reference: mobiMatterOrder.orderId,
      },
    };

    return payload;
  }

  async flexiroam(plan: eSimPlans) {
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
        throw new HttpException(
          'no sim available in inventory ',
          HttpStatus.BAD_REQUEST,
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
      vendorOrder: {
        cost_price: flexiroamOrder.cost_price,
        iccid: flexiroamOrder.iccid,
        package: plan.package_name,
        reference: flexiroamOrder.orderNo,
      },
    };
    // console.log(payload);
    return payload;
  }

  generateResponseData(order: Orders, payload: any) {
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
        id: order.plan_id.id,
        name: order.plan_id.plan_name,
        price:
          price_mode == 1
            ? order.plan_id.wholesale_price
            : price_mode == 2
            ? order.plan_id.retail_price
            : order.plan_id.platinum_price,
        data: order.plan_id.data,
        validity: order.plan_id.validity,
        region: order.plan_id.region,
        planType:
          order.plan_id.vendor.inventory_type == 1 ? 'E-SIM' : 'PHYSICAL-SIM',
        countries: order.plan_id.countries,
        test_plan: order.plan_id.test_plan,
        signle_use: order.plan_id.singleUse,
        global_plan: order.plan_id.global_plan,
      },
    };

    return responseData;
  }

  bytesToGb(bytes: number) {
    const kb = bytes / 1000;
    const mb = kb / 1000;
    const gb = mb / 1000;
    return gb.toFixed(2);
  }
}

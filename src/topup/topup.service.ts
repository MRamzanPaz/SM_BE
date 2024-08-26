import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import { In, IsNull, Like, Repository } from 'typeorm';
import {
  AdminPackageListDto,
  AdminRechargeableCountryDto,
  ApplyPakacgeDto,
  PaginationDto,
  RechargeDto,
  topupDto,
} from './topup.dto';
import { Request, query } from 'express';
import { ResponseService } from 'src/shared/services/response.service';
import { ApiService } from 'src/shared/services/api.service';
import { JwtService } from 'src/shared/services/jwt.service';
import { Orders } from 'src/entities/order.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { NodeMailService } from 'src/mail/node-mail.service';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';
@Injectable()
export class TopupService {
  constructor(
    @InjectRepository(eSimPlans)
    private readonly _eSimPlansRepo: Repository<eSimPlans>,
    @InjectRepository(AssignPlanToWl)
    private readonly _assignPlanRepo: Repository<AssignPlanToWl>,
    @InjectRepository(TopUpHistory)
    private readonly _TopupRepo: Repository<TopUpHistory>,
    @InjectRepository(Orders) private readonly _ordersRepo: Repository<Orders>,
    @InjectRepository(Wl_Account)
    private readonly _wlAccountRepo: Repository<Wl_Account>,
    @InjectRepository(Wallet_Transaction)
    private readonly _walletRepo: Repository<Wallet_Transaction>,
    @InjectRepository(ActivatedESims)
    private readonly _activateEsimRepo: Repository<ActivatedESims>,
    @InjectRepository(VendorsOrder)
    private readonly _vendorOrderRepo: Repository<VendorsOrder>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
    @Inject('JWT-SERVICE') private jwt: JwtService,
    private _mailer: NodeMailService,
  ) {}

  // ================================================== WHITELABEL-BUSINESS-LOGIC =========================================================

  async getAllRechargeableEsims(req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const esimList1 = await this._activateEsimRepo.find({
        where: {
          deleted_at: IsNull(),
          wl_account: {
            id: wl_acount.id,
          },
        },
        select: {
          iccid: true,
        },
      });

      const esimList2 = await this._ordersRepo.query(`
            SELECT od.iccid FROM order_details AS od
            RIGHT JOIN orders AS o
            ON  o.detial_id = od.id
            LEFT JOIN e_sim_plans AS ep ON o.plan_id = ep.id
            WHERE o.status = "COMPLETED" AND o.wl_id = ${wl_acount.id} AND (
            ep.singleUse = 0
            );
            `);

      const data = [...esimList1, ...esimList2];

      return this.res.generateResponse(
        HttpStatus.OK,
        'Esim List for recharge',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllCountryListByIccid(iccid: string, req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );
      // console.log(wl_acount);

      const order = await this._ordersRepo.findOne({
        where: {
          status: 'COMPLETED',
          order_details: {
            iccid: iccid,
          },
          wl_id: {
            id: wl_acount.id,
          },
        },
        relations: {
          order_details: true,
          plan_id: {
            vendor: true,
            countries: true,
          },
          wl_id: true,
        },
      });

      const activateEsim = await this._activateEsimRepo.findOne({
        where: {
          iccid: iccid,
          deleted_at: IsNull(),
          wl_account: {
            id: wl_acount.id,
          },
        },
      });

      if (!order && !activateEsim) {
        throw new HttpException(
          'Invalid ICCID entered!',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (activateEsim) {
        const countryList = await this._assignPlanRepo
          .query(
            `
                    SELECT c.country_name, c.country_code, c.iso2, c.iso3, c.phone_code FROM assign_plan_to_wl AS aspw
                    LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
                    LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
                    LEFT JOIN countries AS c ON epc.countriesId = c.id
                    WHERE aspw.deleted_at IS NULL AND wl_id = ${wl_acount.id} AND ep.vendor_id = 3 AND ep.package_name LIKE '%esimgnr%'
                    GROUP BY epc.countriesId
                    ORDER BY epc.countriesId ASC
                    `,
          )
          .finally();
        return this.res.generateResponse(
          HttpStatus.OK,
          'recharge country list',
          countryList,
          req,
        );
      } else {
        const countryList = await this.getCountryList(order);
        return this.res.generateResponse(
          HttpStatus.OK,
          'recharge country list',
          countryList,
          req,
        );
      }
    } catch (error) {
      console.log(error);
      return this.res.generateError(error, req);
    }
  }

  async getCountryList(order: Orders) {
    let list: any[] = [];
    switch (order.plan_id.vendor.name) {
      case 'esim-go':
        list = await this.getEsimGoIccidCountryList(order);
        break;
      case 'Airalo':
        list = await this.getAirAloIccidCountryList(order);
        break;
      case 'red-tea':
        list = await this.getRedIccidCountryList(order);
        break;
      case 'Flexiroam':
        list = await this.getFlexiroamIccidCountryList(order);
        break;
      default:
        break;
    }

    return list;
  }

  async getEsimGoIccidCountryList(order: Orders) {
    const packagestr: any[] = order.plan_id.package_name.split('_');
    console.log(packagestr);
    const searchStr = `${packagestr[3]}_${packagestr[4]}`;
    console.log(searchStr);

    const countryList = await this._assignPlanRepo
      .query(
        `
            SELECT c.country_name, c.country_code, c.iso2, c.iso3, c.phone_code FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND wl_id = ${order.wl_id.id} AND ep.vendor_id = 3 AND ep.package_name LIKE '%${searchStr}%'
            GROUP BY epc.countriesId
            ORDER BY epc.countriesId ASC
            `,
      )
      .finally();

    return countryList;
  }

  async getFlexiroamIccidCountryList(order: Orders) {
    const countryList = await this._assignPlanRepo
      .query(
        `
            SELECT c.country_name, c.country_code, c.iso2, c.iso3, c.phone_code FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND wl_id = ${order.wl_id.id} AND ep.vendor_id = 6
            GROUP BY epc.countriesId
            ORDER BY epc.countriesId ASC
            `,
      )
      .finally();

    return countryList;
  }

  async getAirAloIccidCountryList(order: Orders) {
    const { data: packageData } = await this._api.getAirAloTopupPackages(
      order.order_details.iccid,
    );

    const packageList = packageData.map((ele: any) =>
      ele.id.replace('-topup', ''),
    );

    const countryList = await this._assignPlanRepo
      .query(
        `
            SELECT c.country_name, c.country_code, c.iso2, c.iso3, c.phone_code FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND ep.package_name IN('${packageList.join(
              ',',
            )}') AND wl_id = ${order.wl_id.id}
            GROUP BY epc.countriesId
            ORDER BY epc.countriesId ASC
            `,
      )
      .finally();

    return countryList;
  }

  async getRedIccidCountryList(order: Orders) {
    return order.plan_id.countries;
  }

  async getAllPackagesListByIccidAndCountry(qery: RechargeDto, req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );
      const { iccid, iso3 } = qery;

      const order = await this._ordersRepo.findOne({
        where: {
          status: 'COMPLETED',
          order_details: {
            iccid: iccid,
          },
          wl_id: {
            id: wl_acount.id,
          },
        },
        relations: {
          order_details: true,
          plan_id: {
            vendor: true,
          },
          wl_id: true,
        },
      });

      const activateEsim = await this._activateEsimRepo.findOne({
        where: {
          iccid: iccid,
          deleted_at: IsNull(),
          wl_account: {
            id: wl_acount.id,
          },
        },
      });

      if (!order && !activateEsim) {
        throw new HttpException(
          'Invalid ICCID entered!',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (activateEsim) {
        const plans = await this._assignPlanRepo
          .query(
            `
                    SELECT * FROM assign_plan_to_wl AS aspw
                    LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
                    LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
                    LEFT JOIN countries AS c ON epc.countriesId = c.id
                    WHERE aspw.deleted_at IS NULL AND wl_id = ${wl_acount.id} AND ep.vendor_id = 3 AND c.iso3 = '${iso3}' AND ep.deleted_at IS NULL AND ep.package_name LIKE '%esimgnr%'
                    GROUP BY ep.id
                    ORDER BY ep.id ASC
                    `,
          )
          .finally();

        const data: any[] = [];

        plans.forEach((element: any) => {
          let temp: any;

          temp = {
            id: element.plan_id,
            plan_name: element.plan_name,
            data: element.data,
            validity: element.validity,
            global_plan: element.global_plan == 0 ? false : true,
            isRegional: element.isRegional == 0 ? false : true,
          };

          data.push(temp);
        });

        return this.res.generateResponse(
          HttpStatus.OK,
          'plans list',
          data,
          req,
        );
      } else {
        const data = await this.getPlansForRecharge(order, iso3);
        return this.res.generateResponse(
          HttpStatus.OK,
          'plans list',
          data,
          req,
        );
      }
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getPlansForRecharge(order: Orders, iso3: string) {
    let list: any[] = [];

    switch (order.plan_id.vendor.name) {
      case 'esim-go':
        list = await this.getEsimGoRechargePlanList(order, iso3);
        break;
      case 'Airalo':
        list = await this.getAiraloRechargePlanList(order, iso3);
        break;
      case 'red-tea':
        list = await this.getRedTeaRechargePlanList(order);
        break;
      case 'Flexiroam':
        list = await this.getFlexiroamRechargePlanList(order, iso3);
        break;
      default:
        break;
    }

    return list;
  }

  async getEsimGoRechargePlanList(order: Orders, iso3: string) {
    const packagestr: any[] = order.plan_id.package_name.split('_');
    console.log(packagestr);
    const searchStr = `${packagestr[3]}_${packagestr[4]}`;
    console.log(searchStr);

    const plans = await this._assignPlanRepo
      .query(
        `
            SELECT * FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND wl_id = ${order.wl_id.id} AND ep.vendor_id = 3 AND c.iso3 = '${iso3}' AND ep.deleted_at IS NULL AND ep.package_name LIKE '%${searchStr}%'
            GROUP BY ep.id
            ORDER BY ep.id ASC
            `,
      )
      .finally();

    const data: any[] = [];

    plans.forEach((element: any) => {
      let temp: any;

      temp = {
        id: element.plan_id,
        plan_name: element.plan_name,
        data: element.data,
        validity: element.validity,
        global_plan: element.global_plan == 0 ? false : true,
        isRegional: element.isRegional == 0 ? false : true,
      };

      data.push(temp);
    });

    return data;
  }

  async getFlexiroamRechargePlanList(order: Orders, iso3: string) {
    const plans = await this._assignPlanRepo
      .query(
        `
            SELECT * FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND wl_id = ${order.wl_id.id} AND ep.vendor_id = 6 AND c.iso3 = '${iso3}' AND ep.deleted_at IS NULL
            GROUP BY ep.id
            ORDER BY ep.id ASC
            `,
      )
      .finally();

    const data: any[] = [];

    plans.forEach((element: any) => {
      let temp: any;

      temp = {
        id: element.plan_id,
        plan_name: element.plan_name,
        data: element.data,
        validity: element.validity,
        global_plan: element.global_plan == 0 ? false : true,
        isRegional: element.isRegional == 0 ? false : true,
      };

      data.push(temp);
    });

    return data;
  }

  async getAiraloRechargePlanList(order: Orders, iso3: string) {
    const { data: packageData } = await this._api.getAirAloTopupPackages(
      order.order_details.iccid,
    );

    const packageList = packageData.map((ele: any) =>
      ele.id.replace('-topup', ''),
    );

    const assignPlansList = await this._assignPlanRepo.find({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: order.wl_id.id,
        },
        plan: {
          package_name: In(packageList),
          countries: {
            iso3: In([iso3]),
          },
        },
      },
      relations: {
        plan: {
          vendor: true,
          countries: true,
        },
      },
    });

    let data: any[] = [];
    for (const _p of assignPlansList) {
      let temp: any;

      temp = {
        id: _p.plan.id,
        plan_name: _p.plan.plan_name,
        data: _p.plan.data,
        validity: _p.plan.validity,
        isRegional: _p.plan.isRegional,
        global_plan: _p.plan.global_plan,
      };

      data.push(temp);
    }

    return data;
  }

  async getRedTeaRechargePlanList(order: Orders | any) {
    const { plan_id } = order;

    const isAssignedToWL = await this._assignPlanRepo.findOne({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: order.wl_id.id,
        },
        plan: {
          id: plan_id.id,
        },
      },
      relations: {
        plan: {
          vendor: true,
          countries: true,
        },
      },
    });

    let data: any[] = [];

    const plan = {
      id: isAssignedToWL.plan.id,
      plan_name: isAssignedToWL.plan.plan_name,
      data: isAssignedToWL.plan.data,
      validity: isAssignedToWL.plan.validity,
      global_plan: isAssignedToWL.plan.global_plan,
      isRegional: isAssignedToWL.plan.isRegional,
    };

    data.push(plan);

    return data;
  }

  async applyToptup(body: topupDto, req: Request) {
    try {
      const { plan_id, iccid } = body;

      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const isAssign: AssignPlanToWl = await this._assignPlanRepo.findOne({
        where: {
          plan: {
            id: plan_id,
          },
          wl_account: {
            id: wl_acount.id,
          },
          deleted_at: IsNull(),
        },
        relations: {
          plan: {
            vendor: true,
          },
        },
      });

      if (!isAssign) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Please provide us correct plan ID!',
          null,
          req,
        );
      }

      const {
        plan: {
          vendor: { name, id: newPlanVendor },
        },
        plan,
      } = isAssign;

      const applicableVendors: string[] = [
        'airalo',
        'esim-go',
        'red-tea',
        'flexiroam',
      ];

      const selectedVendor = applicableVendors.findIndex((_vendoer: string) =>
        _vendoer.includes(plan.vendor.name.toLowerCase()),
      );
      console.log(selectedVendor);

      if (selectedVendor < 0) {
        return this.res.generateResponse(
          HttpStatus.EXPECTATION_FAILED,
          'Top up is not applicable on this eSIM !',
          null,
          req,
        );
      }

      const isApplied =
        process.env.NODE_ENV == 'dev'
          ? true
          : await this.applyBundle(plan, iccid, selectedVendor);

      if (!isApplied) {
        return this.res.generateResponse(
          HttpStatus.BAD_GATEWAY,
          'Internal server error!',
          null,
          req,
        );
      }

      const amountToDeduct =
        isAssign.price_mode == 1
          ? parseFloat(plan.wholesale_price)
          : isAssign.price_mode == 2
          ? parseFloat(plan.retail_price)
          : parseFloat(plan.platinum_price);

      const Transaction: any = await this.performWalletTransaction(
        amountToDeduct,
        iccid,
        req,
      );

      if (!Transaction) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
          null,
          req,
        );
      }

      let vendor_order = isApplied;

      if (process.env.NODE_ENV == 'dev') {
        vendor_order = {
          iccid: iccid,
          reference: 'SANDBOX-REF-TOPUP',
          cost_price: 1.0,
          package: plan.package_name,
        };
      }

      const vendorOrdr: any = this._vendorOrderRepo.create(vendor_order);
      await this._vendorOrderRepo.save(vendorOrdr);

      if (plan.vendor.id == 1) {
        this.setAiraloNetPrice(vendorOrdr);
      }

      const payload = {
        iccid: iccid,
        plan: plan,
        status: 'COMPLETED',
        wallet_transaction: Transaction,
        vendors_order: vendorOrdr,
      };

      const createTopUpHistory = this._TopupRepo.create(payload);
      const topup = await this._TopupRepo.save(createTopUpHistory);

      await this._TopupRepo
        .createQueryBuilder()
        .update()
        .set({
          order_no: `SMR-${topup.id}`,
        })
        .where('id = :id', { id: topup.id })
        .execute();

      const mailerObj = {
        to: wl_acount.email,
        // to: 'shafiq.paz.agency@gmail.com',
        iccid: iccid,
        plan_name: plan.plan_name,
        data: plan.data,
        validity: plan.validity,
        price: amountToDeduct,
        customer_name: wl_acount.username,
        order_no: `SMR-${topup.id}`,
      };

      console.log(wl_acount);

      await this._mailer.sendRechargeEmail(mailerObj);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Top-Up process successfully completed!',
        { status: 'Completed', order_no: `SMR-${topup.id}` },
        req,
      );
    } catch (error) {
      console.log(error);
      return this.res.generateError(error, req);
    }
  }

  async applyBundle(plan: eSimPlans, iccid: string, selectedVendor: number) {
    console.log('run');
    let ret = null;

    switch (selectedVendor) {
      case 0:
        ret = await this.applyAiraloBundle(plan, iccid);
        break;
      case 1:
        ret = await this.applyEsimBundle(plan, iccid);
        break;
      case 2:
        ret = await this.applyRedTeaBundle(plan, iccid);
        break;
      case 3:
        ret = await this.applyFlexiroamBundle(plan, iccid);
        break;
      default:
        break;
    }

    console.log('vendor data', ret);

    return ret;
  }

  async applyEsimBundle(plan: eSimPlans, iccid: string) {
    const processOrderBody = {
      type: process.env.NODE_ENV == 'prod' ? 'transaction' : 'validate',
      assign: true,
      Order: [
        {
          type: 'bundle',
          quantity: 1,
          item: plan.package_name,
          iccids: [iccid],
        },
      ],
    };

    const isProcessed = await this._api.eSimGoProcessOrder(processOrderBody);
    console.log('process ==> ', isProcessed);

    if (!iccid) {
      throw new HttpException(
        'Sorry there is an issue with this request, please contact support!',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // const applyBundleBody = {
    //     iccid: iccid,
    //     bundle: plan.package_name,
    //     startTime: "",
    // }

    // const data = await this._api.eSimGoApplyBundle(applyBundleBody);

    // console.log("data ==> ", data)

    // if (data.status == 403 || data.status == 400) {

    //     throw new HttpException("Sorry there is an issue with this request, please contact support!", HttpStatus.INTERNAL_SERVER_ERROR)
    //     // const processOrderBody = {
    //     //     type: process.env.NODE_ENV == 'prod' ? 'transaction' : 'validate',
    //     //     assign: false,
    //     //     Order: [
    //     //         {
    //     //             type: "bundle",
    //     //             quantity: 1,
    //     //             item: plan.package_name
    //     //         }
    //     //     ]
    //     // }

    //     // const isProcessed = await this._api.eSimGoProcessOrder(processOrderBody);
    //     // console.log("process ==> ", isProcessed)
    //     // return await this.applyEsimBundle(plan, iccid)
    // }

    const esimOrder = await this._api.getEsimGoSpecificOrders(
      isProcessed.orderReference,
    );

    const vendorData = {
      reference: isProcessed.orderReference,
      iccid: iccid,
      package: plan.package_name,
      cost_price: esimOrder.order[0].pricePerUnit,
    };

    return vendorData;
  }

  async applyAiraloBundle(plan: eSimPlans, iccid: string) {
    const body = {
      package_id: `${plan.package_name}-topup`,
      iccid: iccid,
    };

    console.log('body =============', body);

    const response = await this._api.airaloApplyBundle(body);

    console.log(response);

    const vendorData = {
      reference: response.data.id,
      iccid: iccid,
      package: plan.package_name,
      cost_price: response.data.price,
    };

    return vendorData;
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

    await this._vendorOrderRepo
      .createQueryBuilder()
      .update()
      .set({
        cost_price: airAloPackage.net_price,
      })
      .where('id = :id', { id: vo.id })
      .execute();
  }

  async applyRedTeaBundle(plan: eSimPlans, iccid: string) {
    const payload = {
      iccid: iccid,
      topUpCode: `TOPUP_${plan.package_name}`,
    };

    console.log('red tea recharge body =============', payload);

    const response = await this._api.RedteaBundleApply(payload);

    console.log(response);

    const packageDetails = await this.getRedTeaDataPackage(plan);

    const vendorData = {
      reference: response.obj.transactionId,
      iccid: iccid,
      package: plan.package_name,
      cost_price: packageDetails.obj.packageList[0]?.price / 10000,
    };

    return vendorData;
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

  async applyFlexiroamBundle(plan: eSimPlans, iccid: string) {
    const simPayload = {
      availability: '1',
      iccid: iccid,
    };

    const SIM = await this._api.flexiroamGetSims(simPayload);

    const rechargePayload = {
      sku: SIM.data[0].sku,
      plan_code: plan.package_name,
      plan_start_type_id: 1,
    };
    console.log(rechargePayload);

    const rechargeSim = await this._api.flexiroamPurchasePlan(rechargePayload);

    console.log('=========================================');
    console.log(rechargeSim);
    console.log('=========================================');

    const vendorData = {
      reference: rechargeSim.data.order_no,
      iccid: iccid,
      package: plan.package_name,
      cost_price: rechargeSim.data.items[0].total_price,
    };

    return vendorData;
  }

  async performWalletTransaction(amount: number, iccid: string, req: Request) {
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
      message: `System deduct balance from ${isValidAcc.username} by completing topup against this iccid ${iccid}`,
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

    return createWalletHistory.id;
  }

  async getAllTopupPackages(iccid: string, req: Request) {
    try {
      const wl_account: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const { id } = wl_account;

      const findInActivatedEsims = await this._activateEsimRepo.findOne({
        where: {
          iccid: iccid,
          deleted_at: IsNull(),
          wl_account: {
            id: id,
          },
        },
      });

      const findInOrders = await this._ordersRepo.findOne({
        where: {
          deleted_at: IsNull(),
          order_details: {
            iccid: iccid,
          },
          wl_id: {
            id: id,
          },
        },
        relations: {
          plan_id: {
            vendor: true,
          },
          wl_id: true,
          order_details: true,
        },
      });

      if (!findInActivatedEsims && !findInOrders) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Please provide Valid Iccid!',
          null,
          req,
        );
      }

      let data: any[] = [];

      if (findInActivatedEsims) {
        const allPlans = await this._assignPlanRepo.find({
          where: {
            deleted_at: IsNull(),
            wl_account: {
              id: id,
            },
            plan: {
              singleUse: false,
              package_name: Like('%esimgnr%'),
              vendor: {
                id: 3, // work just only for esim-go
              },
            },
          },
          relations: {
            plan: {
              vendor: true,
            },
          },
        });

        for (const _p of allPlans) {
          let temp: any;

          temp = {
            id: _p.plan.id,
            name: _p.plan.plan_name,
            price: _p.isRetailPrice
              ? _p.plan.retail_price
              : _p.plan.wholesale_price,
            data: _p.plan.data,
            validity: _p.plan.validity,
            region: _p.plan.region,
            planType:
              _p.plan.vendor.inventory_type == 1 ? 'E-SIM' : 'Physical SIM',
            countries: _p.plan.countries,
            testPlan: _p.plan.test_plan,
            singleUse: _p.plan.singleUse,
            global_plan: _p.plan.global_plan,
          };

          data.push(temp);
        }

        return this.res.generateResponse(
          HttpStatus.OK,
          'Topup plans list!',
          data,
          req,
        );
      } else {
        switch (findInOrders.plan_id.vendor.name) {
          case 'esim-go':
            data = await this.getEsimGoRechargePackageList(findInOrders);
            break;
          case 'Airalo':
            data = await this.getAirAloRechargePackageList(findInOrders);
            break;
          case 'red-tea':
            data = await this.getRedteaRechargePackageList(findInOrders);
            break;
          case 'Flexiroam':
            data = await this.getFlexiroamRechargePackageList(
              findInOrders.wl_id.id,
            );
            break;
          default:
            break;
        }

        return this.res.generateResponse(
          HttpStatus.OK,
          'plans list',
          data,
          req,
        );
      }
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getEsimGoRechargePackageList(order: Orders) {
    const packagestr: any[] = order.plan_id.package_name.split('_');
    console.log(packagestr);
    const searchStr = `${packagestr[3]}_${packagestr[4]}`;
    const allPlans = await this._assignPlanRepo.find({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: order.wl_id.id,
        },
        plan: {
          singleUse: false,
          package_name: Like(`%${searchStr}%`),
          vendor: {
            id: 3, // work just only for esim-go
          },
        },
      },
      relations: {
        plan: {
          vendor: true,
        },
      },
    });

    let data: any[] = [];
    for (const _p of allPlans) {
      let temp: any;

      temp = {
        id: _p.plan.id,
        name: _p.plan.plan_name,
        price: _p.isRetailPrice
          ? _p.plan.retail_price
          : _p.plan.wholesale_price,
        data: _p.plan.data,
        validity: _p.plan.validity,
        region: _p.plan.region,
        planType: _p.plan.vendor.inventory_type == 1 ? 'E-SIM' : 'Physical SIM',
        countries: _p.plan.countries,
        testPlan: _p.plan.test_plan,
        singleUse: _p.plan.singleUse,
        global_plan: _p.plan.global_plan,
      };

      data.push(temp);
    }

    return data;
  }

  async getFlexiroamRechargePackageList(wl_id: any) {
    const allPlans = await this._assignPlanRepo.find({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: wl_id,
        },
        plan: {
          singleUse: false,
          vendor: {
            id: 6, // work just only for Flexiroam
          },
        },
      },
      relations: {
        plan: {
          vendor: true,
        },
      },
    });

    let data: any[] = [];
    for (const _p of allPlans) {
      let temp: any;

      temp = {
        id: _p.plan.id,
        name: _p.plan.plan_name,
        price: _p.isRetailPrice
          ? _p.plan.retail_price
          : _p.plan.wholesale_price,
        data: _p.plan.data,
        validity: _p.plan.validity,
        region: _p.plan.region,
        planType: _p.plan.vendor.inventory_type == 1 ? 'E-SIM' : 'Physical SIM',
        countries: _p.plan.countries,
        testPlan: _p.plan.test_plan,
        singleUse: _p.plan.singleUse,
        global_plan: _p.plan.global_plan,
      };

      data.push(temp);
    }

    return data;
  }

  async getAirAloRechargePackageList(order: Orders) {
    const { data: packageData } = await this._api.getAirAloTopupPackages(
      order.order_details.iccid,
    );

    const packageList = packageData.map((ele: any) =>
      ele.id.replace('-topup', ''),
    );

    const assignPlansList = await this._assignPlanRepo.find({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: order.wl_id.id,
        },
        plan: {
          package_name: In(packageList),
        },
      },
      relations: {
        plan: {
          vendor: true,
          countries: true,
        },
      },
    });

    let data: any[] = [];
    for (const _p of assignPlansList) {
      let temp: any;

      temp = {
        id: _p.plan.id,
        name: _p.plan.plan_name,
        price: _p.isRetailPrice
          ? _p.plan.retail_price
          : _p.plan.wholesale_price,
        data: _p.plan.data,
        validity: _p.plan.validity,
        region: _p.plan.region,
        planType: _p.plan.vendor.inventory_type == 1 ? 'E-SIM' : 'Physical SIM',
        countries: _p.plan.countries,
        testPlan: _p.plan.test_plan,
        singleUse: _p.plan.singleUse,
        global_plan: _p.plan.global_plan,
      };

      data.push(temp);
    }

    return data;
  }

  async getRedteaRechargePackageList(order: Orders | any) {
    const { plan_id } = order;

    const isAssignedToWL = await this._assignPlanRepo.findOne({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: order.wl_id.id,
        },
        plan: {
          id: plan_id.id,
        },
      },
      relations: {
        plan: {
          vendor: true,
          countries: true,
        },
      },
    });

    let data: any[] = [];

    const plan = {
      id: isAssignedToWL.plan.id,
      name: isAssignedToWL.plan.plan_name,
      price: isAssignedToWL.isRetailPrice
        ? isAssignedToWL.plan.retail_price
        : isAssignedToWL.plan.wholesale_price,
      data: isAssignedToWL.plan.data,
      validity: isAssignedToWL.plan.validity,
      region: isAssignedToWL.plan.region,
      planType:
        isAssignedToWL.plan.vendor.inventory_type == 1
          ? 'E-SIM'
          : 'Physical SIM',
      countries: isAssignedToWL.plan.countries,
      testPlan: isAssignedToWL.plan.test_plan,
      singleUse: isAssignedToWL.plan.singleUse,
      global_plan: isAssignedToWL.plan.global_plan,
    };

    data.push(plan);

    return data;
  }

  async getAllTopupOrders(req: Request) {
    try {
      const wl_account: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const topupOrders = await this._TopupRepo.find({
        where: {
          deleted_at: IsNull(),
          wallet_transaction: {
            wl_id: {
              id: wl_account.id,
            },
          },
        },
        relations: {
          plan: true,
          wallet_transaction: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Topup Orders List',
        topupOrders,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllTopupOrdersWithPagination(
    query: PaginationDto,
    body: any,
    req: Request,
  ) {
    try {
      const { page, pageSize, searchStr } = query;
      const wl_account: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const topupOrders = await this._TopupRepo.find({
        where: [
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            iccid: Like(`%${searchStr}%`),
          },
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            plan: { plan_name: Like(`%${searchStr}%`) },
          },
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            plan: { region: Like(`%${searchStr}%`) },
          },
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            plan: { data: Like(`%${searchStr}%`) },
          },
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            plan: { validity: Like(`%${searchStr}%`) },
          },
        ],
        relations: {
          plan: {
            countries: true,
          },
          wallet_transaction: true,
        },
        select: {
          plan: {
            plan_name: true,
            region: true,
            countries: true,
            data: true,
            validity: true,
          },
        },
        order: {
          ...body,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const count = await this._TopupRepo.count({
        where: [
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            iccid: Like(`%${searchStr}%`),
          },
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            plan: { plan_name: Like(`%${searchStr}%`) },
          },
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            plan: { region: Like(`%${searchStr}%`) },
          },
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            plan: { data: Like(`%${searchStr}%`) },
          },
          {
            deleted_at: IsNull(),
            wallet_transaction: { wl_id: wl_account.id },
            plan: { validity: Like(`%${searchStr}%`) },
          },
        ],
        relations: {
          plan: {
            countries: true,
          },
        },
        select: {
          plan: {
            plan_name: true,
            region: true,
            countries: true,
            data: true,
            validity: true,
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const data = {
        list: topupOrders,
        total_count: count,
        page,
        pageSize,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Topup Orders List!',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  // ================================================== WHITELABEL-BUSINESS-LOGIC =========================================================
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // ================================================== ADMIN-BUSINESS-LOGIC ==============================================================

  async getAllTopupOrderListForAdmin(req: Request) {
    try {
      const topups = await this._TopupRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          plan: true,
          wallet_transaction: true,
        },
        order: {
          id: 'DESC',
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Topup Orders List',
        topups,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllTopupOrderListForAdminByPagination(
    query: PaginationDto,
    req: Request,
  ) {
    try {
      const topups = await this._TopupRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          plan: true,
          wallet_transaction: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Topup Orders List',
        topups,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async adjustopupOrder(body: any, req: Request) {
    try {
      const allTopups = await this._TopupRepo.find();

      for (let index = 0; index < allTopups.length; index++) {
        const id = allTopups[index].id;

        await this._TopupRepo
          .createQueryBuilder()
          .update()
          .set({
            order_no: `SMR-${id}`,
          })
          .where('id = :id', { id: id })
          .execute();

        console.log('update: ', `SMR-${id}`);
      }

      return allTopups.length;
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async adjustopupOrderStatus(body: any, req: Request) {
    try {
      const allTopups = await this._TopupRepo.find();

      for (let index = 0; index < allTopups.length; index++) {
        const id = allTopups[index].id;

        await this._TopupRepo
          .createQueryBuilder()
          .update()
          .set({
            status: `COMPLETED`,
          })
          .where('id = :id', { id: id })
          .execute();
      }

      return allTopups.length;
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllRechargeAbleEsimListByWhitelabel(wl_id: string, req: Request) {
    try {
      const esimList1 = await this._activateEsimRepo.find({
        where: {
          deleted_at: IsNull(),
          wl_account: {
            id: parseInt(wl_id),
          },
        },
        select: {
          iccid: true,
        },
      });

      const esimList2 = await this._ordersRepo.query(`
            SELECT od.iccid FROM order_details AS od
            RIGHT JOIN orders AS o
            ON  o.detial_id = od.id
            LEFT JOIN e_sim_plans AS ep ON o.plan_id = ep.id
            WHERE o.status = "COMPLETED" AND o.wl_id = ${parseInt(
              wl_id,
            )} AND ep.singleUse = 0 AND o.deleted_at IS NULL;
            `);

      const data = [...esimList1, ...esimList2];

      return this.res.generateResponse(
        HttpStatus.OK,
        'Esim List for recharge',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllRechargeCountryListForAdmin(
    query: AdminRechargeableCountryDto,
    req: Request,
  ) {
    try {
      const { wl_id, iccid } = query;

      const order = await this._ordersRepo.findOne({
        where: {
          status: 'COMPLETED',
          deleted_at: IsNull(),
          order_details: {
            iccid: iccid,
          },
          wl_id: {
            id: wl_id,
          },
        },
        relations: {
          wl_id: true,
          plan_id: {
            vendor: true,
            countries: true,
          },
        },
      });

      console.log(order);

      const activateEsim = await this._activateEsimRepo.findOne({
        where: {
          iccid: iccid,
          deleted_at: IsNull(),
          wl_account: {
            id: wl_id,
          },
        },
      });

      if (!order && !activateEsim) {
        throw new HttpException(
          'Invalid ICCID entered!',
          HttpStatus.BAD_REQUEST,
        );
      }

      let countryList: any[] = [];

      if (activateEsim) {
        countryList = await this._assignPlanRepo
          .query(
            `
                    SELECT c.country_name, c.country_code, c.iso2, c.iso3, c.phone_code FROM assign_plan_to_wl AS aspw
                    LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
                    LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
                    LEFT JOIN countries AS c ON epc.countriesId = c.id
                    WHERE aspw.deleted_at IS NULL AND wl_id = ${wl_id} AND ep.vendor_id = 3 AND ep.package_name LIKE '%esimgnr%'
                    GROUP BY epc.countriesId
                    ORDER BY epc.countriesId ASC
                    `,
          )
          .finally();

        return this.res.generateResponse(
          HttpStatus.OK,
          'recharge country list',
          countryList,
          req,
        );
      } else {
        switch (order.plan_id.vendor.name) {
          case 'esim-go':
            countryList = await this.getEsimGoRechargeCountry(order);
            break;
          case 'Airalo':
            countryList = await this.getAiraloRechargeCountry(order);
            break;
          case 'red-tea':
            countryList = await this.getRedteaRechargeCountry(order);
            break;
          case 'Flexiroam':
            countryList = await this.getFlexiroamRechargeCountry(order);
            break;
          default:
            break;
        }
      }

      // console.log(countryList);

      return this.res.generateResponse(
        HttpStatus.OK,
        'recharge country list',
        countryList,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getEsimGoRechargeCountry(order: Orders) {
    const packagestr: any[] = order.plan_id.package_name.split('_');
    console.log(packagestr);
    const searchStr = `${packagestr[3]}_${packagestr[4]}`;
    console.log(searchStr);

    const countryList = await this._assignPlanRepo
      .query(
        `
            SELECT c.country_name, c.country_code, c.iso2, c.iso3, c.phone_code FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND wl_id = ${order.wl_id.id} AND ep.vendor_id = 3 AND ep.package_name LIKE '%${searchStr}%'
            GROUP BY epc.countriesId
            ORDER BY epc.countriesId ASC
            `,
      )
      .finally();

    // console.log(countryList);

    return countryList;
  }

  async getAiraloRechargeCountry(order: Orders) {
    const isAssign = await this._assignPlanRepo.findOne({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: order.wl_id.id,
        },
        plan: {
          id: order.plan_id.id,
        },
      },
    });

    if (!isAssign) {
      return [];
    }

    const countryList = order.plan_id.countries;

    return countryList;
  }

  async getRedteaRechargeCountry(order: Orders) {
    const isAssign = await this._assignPlanRepo.findOne({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: order.wl_id.id,
        },
        plan: {
          id: order.plan_id.id,
        },
      },
    });

    if (!isAssign) {
      return [];
    }

    const countryList = order.plan_id.countries;

    return countryList;
  }

  async getFlexiroamRechargeCountry(order: Orders) {
    const countryList = await this._assignPlanRepo
      .query(
        `
            SELECT c.country_name, c.country_code, c.iso2, c.iso3, c.phone_code FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND wl_id = ${order.wl_id.id} AND ep.vendor_id = 6
            GROUP BY epc.countriesId
            ORDER BY epc.countriesId ASC
            `,
      )
      .finally();

    console.log(countryList);

    return countryList;
  }

  async getAllTopupPackageListForAdmin(
    query: AdminPackageListDto,
    req: Request,
  ) {
    try {
      const { wl_id, iccid, iso3 } = query;

      const order = await this._ordersRepo.findOne({
        where: {
          status: 'COMPLETED',
          order_details: {
            iccid: iccid,
          },
          wl_id: {
            id: wl_id,
          },
        },
        relations: {
          order_details: true,
          plan_id: {
            vendor: true,
          },
          wl_id: true,
        },
      });

      // console.log(order);

      const activateEsim = await this._activateEsimRepo.findOne({
        where: {
          iccid: iccid,
          deleted_at: IsNull(),
          wl_account: {
            id: wl_id,
          },
        },
      });

      if (!order && !activateEsim) {
        throw new HttpException(
          'Invalid ICCID entered!',
          HttpStatus.BAD_REQUEST,
        );
      }

      let data: any[] = [];

      if (activateEsim) {
        const plans = await this._assignPlanRepo
          .query(
            `
                    SELECT * FROM assign_plan_to_wl AS aspw
                    LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
                    LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
                    LEFT JOIN countries AS c ON epc.countriesId = c.id
                    WHERE aspw.deleted_at IS NULL AND wl_id = ${wl_id} AND ep.vendor_id = 3 AND c.iso3 = '${iso3}' AND ep.package_name LIKE '%esimgnr%' AND ep.deleted_at IS NULL
                    GROUP BY ep.id
                    ORDER BY ep.id ASC
                    `,
          )
          .finally();

        plans.forEach((element: any) => {
          let temp: any;

          temp = {
            id: element.plan_id,
            plan_name: element.plan_name,
            data: element.data,
            validity: element.validity,
            global_plan: element.global_plan == 0 ? false : true,
            isRegional: element.isRegional == 0 ? false : true,
          };

          data.push(temp);
        });

        return this.res.generateResponse(
          HttpStatus.OK,
          'plans list',
          data,
          req,
        );
      } else {
        switch (order.plan_id.vendor.name) {
          case 'esim-go':
            data = await this.getEsimGoRechargePackages(order, iso3);
            break;
          case 'Airalo':
            data = await this.getAiraloRechargePackages(order);
            break;
          case 'red-tea':
            data = await this.getRedteaRechargePackages(order);
            break;
          case 'Flexiroam':
            data = await this.getFlexiroamRechargePackages(wl_id, iso3);
            break;
          default:
            break;
        }

        return this.res.generateResponse(
          HttpStatus.OK,
          'plans list',
          data,
          req,
        );
      }
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getEsimGoRechargePackages(order: Orders, iso3: any) {
    const packagestr: any[] = order.plan_id.package_name.split('_');
    console.log(packagestr);
    const searchStr = `${packagestr[3]}_${packagestr[4]}`;
    console.log(searchStr);

    const plans = await this._assignPlanRepo
      .query(
        `
            SELECT * FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND wl_id = ${order.wl_id.id} AND ep.vendor_id = 3 AND c.iso3 = '${iso3}' AND ep.deleted_at IS NULL AND ep.package_name LIKE '%${searchStr}%'
            GROUP BY ep.id
            ORDER BY ep.id ASC
            `,
      )
      .finally();

    let data: any[] = [];

    plans.forEach((element: any) => {
      let temp: any;

      temp = {
        id: element.plan_id,
        plan_name: element.plan_name,
        data: element.data,
        validity: element.validity,
        global_plan: element.global_plan == 0 ? false : true,
        isRegional: element.isRegional == 0 ? false : true,
      };

      data.push(temp);
    });

    return data;
  }

  async getFlexiroamRechargePackages(wl_id: any, iso3: any) {
    const plans = await this._assignPlanRepo
      .query(
        `
            SELECT * FROM assign_plan_to_wl AS aspw
            LEFT JOIN e_sim_plans AS ep ON aspw.plan_id = ep.id
            LEFT JOIN e_sim_plans_countries_countries AS epc ON ep.id = epc.eSimPlansId
            LEFT JOIN countries AS c ON epc.countriesId = c.id
            WHERE aspw.deleted_at IS NULL AND wl_id = ${wl_id} AND ep.vendor_id = 6 AND c.iso3 = '${iso3}' AND ep.deleted_at IS NULL
            GROUP BY ep.id
            ORDER BY ep.id ASC
            `,
      )
      .finally();

    let data: any[] = [];

    plans.forEach((element: any) => {
      let temp: any;

      temp = {
        id: element.plan_id,
        plan_name: element.plan_name,
        data: element.data,
        validity: element.validity,
        global_plan: element.global_plan == 0 ? false : true,
        isRegional: element.isRegional == 0 ? false : true,
      };

      data.push(temp);
    });

    return data;
  }

  async getAiraloRechargePackages(order: Orders) {
    const { data: packageData } = await this._api.getAirAloTopupPackages(
      order.order_details.iccid,
    );

    const packageList = packageData.map((ele: any) =>
      ele.id.replace('-topup', ''),
    );

    const assignPlansList = await this._assignPlanRepo.find({
      where: {
        deleted_at: IsNull(),
        wl_account: {
          id: order.wl_id.id,
        },
        plan: {
          package_name: In(packageList),
        },
      },
      relations: {
        plan: true,
      },
    });

    let data: any[] = [];

    assignPlansList.forEach((element: any) => {
      let temp: any;

      temp = {
        id: element.plan.id,
        plan_name: element.plan.plan_name,
        data: element.plan.data,
        validity: element.plan.validity,
        global_plan: element.plan.global_plan == 0 ? false : true,
        isRegional: element.plan.isRegional == 0 ? false : true,
      };

      data.push(temp);
    });

    return data;
  }

  async getRedteaRechargePackages(order: Orders) {
    console.log(order.plan_id);
    const plan: any[] = [
      {
        id: order.plan_id.id,
        plan_name: order.plan_id.plan_name,
        data: order.plan_id.data,
        validity: order.plan_id.validity,
        global_plan: order.plan_id.global_plan,
        isRegional: order.plan_id.isRegional,
      },
    ];

    return plan;
  }

  async applyPackage(body: ApplyPakacgeDto, req: Request) {
    try {
      const { iccid, plan_id, wl_id } = body;

      const wl_acount = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: wl_id,
        },
      });

      if (!wl_acount) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Please provide us correct whitelabel ID!',
          null,
          req,
        );
      }

      const isAssign: AssignPlanToWl = await this._assignPlanRepo.findOne({
        where: {
          plan: {
            id: plan_id,
          },
          wl_account: {
            id: wl_acount.id,
          },
          deleted_at: IsNull(),
        },
        relations: {
          plan: {
            vendor: true,
          },
        },
      });

      if (!isAssign) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Please provide us correct plan ID!',
          null,
          req,
        );
      }

      const {
        plan: {
          vendor: { name, id: newPlanVendor },
        },
        plan,
      } = isAssign;

      const applicableVendors: string[] = [
        'airalo',
        'esim-go',
        'red-tea',
        'flexiroam',
      ];

      const selectedVendor = applicableVendors.findIndex((_vendoer: string) =>
        _vendoer.includes(plan.vendor.name.toLowerCase()),
      );

      if (selectedVendor < 0) {
        return this.res.generateResponse(
          HttpStatus.EXPECTATION_FAILED,
          'Top up is not applicable on this eSIM !',
          null,
          req,
        );
      }

      const isApplied =
        process.env.NODE_ENV == 'dev'
          ? true
          : await this.applyBundle(plan, iccid, selectedVendor);

      if (!isApplied) {
        return this.res.generateResponse(
          HttpStatus.BAD_GATEWAY,
          'Internal server error!',
          null,
          req,
        );
      }

      const amountToDeduct =
        isAssign.price_mode == 1
          ? parseFloat(plan.wholesale_price)
          : isAssign.price_mode == 2
          ? parseFloat(plan.retail_price)
          : parseFloat(plan.platinum_price);

      const Transaction: any = await this.performWalletTransaction(
        amountToDeduct,
        iccid,
        req,
      );

      if (!Transaction) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'insufficient wallet balance! ',
          null,
          req,
        );
      }

      let vendor_order = isApplied;

      if (process.env.NODE_ENV == 'dev') {
        vendor_order = {
          iccid: iccid,
          reference: 'SANDBOX-REF-TOPUP',
          cost_price: 1.0,
          package: plan.package_name,
        };
      }

      const vendorOrdr: any = this._vendorOrderRepo.create(vendor_order);
      await this._vendorOrderRepo.save(vendorOrdr);

      if (plan.vendor.id == 1) {
        this.setAiraloNetPrice(vendorOrdr);
      }

      const createTopUpHistory = this._TopupRepo.create({
        iccid: iccid,
        plan: plan,
        wallet_transaction: Transaction,
        vendors_order: vendorOrdr,
      });
      const topup = await this._TopupRepo.save(createTopUpHistory);

      await this._TopupRepo
        .createQueryBuilder()
        .update()
        .set({
          order_no: `SMR-${topup.id}`,
        })
        .where('id = :id', { id: topup.id })
        .execute();

      const mailerObj = {
        to: wl_acount.email,
        // to: 'shafiq.paz.agency@gmail.com',
        iccid: iccid,
        plan_name: plan.plan_name,
        data: plan.data,
        validity: plan.validity,
        price: amountToDeduct,
        customer_name: wl_acount.username,
        order_no: `SMR-${topup.id}`,
      };

      await this._mailer.sendRechargeEmail(mailerObj);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Top-Up process successfully completed!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
  // ================================================== ADMIN-BUSINESS-LOGIC ==============================================================
}

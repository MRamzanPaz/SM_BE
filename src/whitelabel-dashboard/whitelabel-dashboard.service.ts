import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { log } from 'console';
import { Request } from 'express';
import { stringify } from 'flatted';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { Orders } from 'src/entities/order.entity';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { Vendors } from 'src/entities/vendors.entity';
import { ApiService } from 'src/shared/services/api.service';
import { JwtService } from 'src/shared/services/jwt.service';
import { ResponseService } from 'src/shared/services/response.service';
import { In, IsNull, Repository } from 'typeorm';
import * as moment from 'moment';
import { Countries } from 'src/entities/country.entity';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';

@Injectable()
export class WhitelabelDashboardService {
  constructor(
    @InjectRepository(Orders) private readonly _ordersRepo: Repository<Orders>,
    @InjectRepository(ActivatedESims)
    private readonly _activateEsimRepo: Repository<ActivatedESims>,
    @InjectRepository(eSimPlans)
    private readonly _plansRepo: Repository<eSimPlans>,
    @InjectRepository(TopUpHistory)
    private readonly _topupRepo: Repository<TopUpHistory>,
    @InjectRepository(Countries)
    private readonly _countryRepo: Repository<Countries>,
    @InjectRepository(AssignPlanToWl)
    private readonly _assignPlanRepo: Repository<AssignPlanToWl>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('JWT-SERVICE') private jwt: JwtService,
    @Inject('API-SERVICE') private _api: ApiService,
  ) {}

  async getAllwhitelabelEsimList(req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );
      const order_iccids = await this._ordersRepo
        .createQueryBuilder('Orders')
        .leftJoinAndSelect('Orders.order_details', 'od')
        .where(
          'Orders.deleted_at IS NULL AND Orders.status = :_s AND Orders.wl_id = :wl_id',
          { _s: 'COMPLETED', wl_id: wl_acount.id },
        )
        .select(['od.iccid AS iccid'])
        .getRawMany();
      const activated_iccids = await this._activateEsimRepo.find({
        where: {
          deleted_at: IsNull(),
          wl_account: {
            id: wl_acount.id,
          },
        },
        select: {
          id: true,
          iccid: true,
        },
      });

      const iccids = [...order_iccids, ...activated_iccids];

      return this.res.generateResponse(
        HttpStatus.OK,
        'Iccids list',
        iccids,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllCountryList(req: Request) {
    try {
      const country_list = await this._countryRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          states: {
            cities: {
              state: false,
            },
          },
        },
      });
      return this.res.generateResponse(
        HttpStatus.OK,
        'Country List',
        country_list,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getEsimDetails(iccid: string, req: Request) {
    try {
      log(iccid);
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );
      const order_esim = await this._ordersRepo.findOne({
        where: {
          deleted_at: IsNull(),
          status: 'COMPLETED',
          order_details: {
            iccid: iccid,
          },
        },
        relations: {
          plan_id: {
            vendor: true,
          },
          order_details: true,
        },
      });

      if (order_esim) {
        let data: any = {
          esim_details: {
            iccid: order_esim.order_details.iccid,
            qr_code: order_esim.order_details.qr_code,
            qrcode_url: order_esim.order_details.qrcode_url,
            smdpAddress: this.spliteCode(order_esim.order_details.qr_code)[1],
            smdpURL: this.spliteCode(order_esim.order_details.qr_code)[2],
            order_id: order_esim.order_id,
            plan_name: order_esim.plan_id.plan_name,
            singleUse: order_esim.plan_id.singleUse,
            apn: order_esim.order_details.apn,
          },
        };

        let active_bundle = await this.selectVendor(order_esim);

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
              parseInt(order_esim.plan_id.validity) &&
            active_bundle?.usage?.remaining_in_gb ==
              parseInt(order_esim.plan_id.data)
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

        data = {
          ...data,
          active_bundle: active_bundle,
        };

        const topupHistory = await this._topupRepo.find({
          where: {
            deleted_at: IsNull(),
            iccid: iccid,
            wallet_transaction: {
              wl_id: {
                id: wl_acount.id,
              },
            },
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

        data = {
          ...data,
          topup_history: topupHistory,
        };

        return this.res.generateResponse(
          HttpStatus.OK,
          'Esim Details',
          data,
          req,
        );
      }

      const activated_esim = await this._activateEsimRepo.findOne({
        where: {
          deleted_at: IsNull(),
          iccid: iccid,
        },
      });

      if (activated_esim) {
        const eSimDetails: any = await this.geteSimDetailAndStatus(iccid);

        if (!eSimDetails) {
          return this.res.generateResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Something went wrong!',
            null,
            req,
          );
        }

        let data: any = {
          esim_details: {
            iccid: eSimDetails.iccid,
            qr_code: `LPA:1$${eSimDetails.smdpAddress}$${eSimDetails.matchingId}`,
            qrcode_url: null,
            smdpAddress: eSimDetails.smdpAddress,
            smdpURL: eSimDetails.matchingId,
            order_id: null,
            singleUse: false,
          },
        };

        const payload = {
          order_details: {
            iccid: eSimDetails.iccid,
          },
        };

        let active_bundle = await this.getEsimGoIccidDetails(payload);

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
              parseInt(active_bundle?.plan?.validity) &&
            active_bundle?.usage?.remaining_in_gb ==
              parseInt(active_bundle?.plan?.data)
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

        data = {
          ...data,
          active_bundle: active_bundle,
        };

        const topupHistory = await this._topupRepo.find({
          where: {
            deleted_at: IsNull(),
            iccid: iccid,
            wallet_transaction: {
              wl_id: {
                id: wl_acount.id,
              },
            },
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

        data = {
          ...data,
          topup_history: topupHistory,
        };

        return this.res.generateResponse(
          HttpStatus.OK,
          'Esim Details',
          data,
          req,
        );
      }

      return this.res.generateResponse(
        HttpStatus.BAD_REQUEST,
        'Invalid iccid',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getPlanGraph(req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const graphData = await this._plansRepo
        .query(
          `
            SELECT plan_name, data, validity, COUNT(o.plan_id) AS COUNT
            FROM e_sim_plans
            LEFT JOIN orders AS o
            ON e_sim_plans.id = o.plan_id
            WHERE o.status = 'COMPLETED' AND o.wl_id = ${wl_acount.id}
            GROUP BY e_sim_plans.id
            ORDER BY COUNT DESC;
            `,
        )
        .finally();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Graph Data',
        graphData,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getPlanGraphGbWise(req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const graphData = await this._plansRepo
        .query(
          `
            SELECT  DATA, COUNT(e_sim_plans.data) AS COUNT
            FROM e_sim_plans
            LEFT JOIN orders AS o
            ON e_sim_plans.id = o.plan_id
            WHERE o.status = 'COMPLETED' AND o.wl_id = ${wl_acount.id}
            GROUP BY e_sim_plans.data
            ORDER BY COUNT DESC;
            `,
        )
        .finally();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Graph Data',
        graphData,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async selectVendor(order: Orders) {
    let ret: any;
    switch (order.plan_id.vendor.name) {
      case 'esim-go':
        ret = await this.getEsimGoIccidDetails(order);
        break;
      case 'keepgo':
        ret = await this.getKeepGoIccidDetails(order);
        break;
      case 'Airalo':
        ret = await this.getAirAloIccidDetails(order);
        break;
      case 'red-tea':
        ret = await this.getRedTeaIccidDetials(order);
        break;
      case 'Mobi-Matter':
        ret = await this.getMobiMatterIccidDetails(order);
      default:
        break;
    }
    return ret;
  }

  async getEsimGoIccidDetails(order: any) {
    let active_bundle: any = {};
    const { bundles } = await this._api.getBundleDetail(
      order.order_details.iccid,
    );
    if (bundles.length) {
      const activeBundle = bundles.find(
        (ele) => ele.assignments[0].bundleState == 'active',
      );
      if (!activeBundle) {
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
          queuePlans,
        };

        return active_bundle;
      }
      const { assignments, name } = activeBundle;

      const order = await this._ordersRepo.findOne({
        where: {
          order_details: {
            vendors_order: {
              package: name,
            },
          },
        },
        relations: {
          plan_id: true,
        },
      });
      let plan: any;

      order ? (plan = order.plan_id) : (plan = []);

      if (!order) {
        const topup = await this._topupRepo.findOne({
          where: {
            vendors_order: {
              package: name,
            },
          },
          relations: {
            plan: true,
          },
        });

        plan = topup.plan;
      }

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
        plan: {
          id: plan.id,
          plan_name: plan.plan_name,
          countries: plan.countries,
          data: plan.data,
          validity: plan.validity,
          singleUse: plan.singleUse,
        },
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

  async geteSimDetailAndStatus(iccid: string) {
    const details = await this._api.geteSimDetailsAndStatus(iccid);

    return details;
  }

  async getKeepGoIccidDetails(order: Orders) {
    const { sim_card } = await this._api.getKeepGoBundleDetails(
      order.order_details.iccid,
    );
    const plan = await this._plansRepo.findOne({
      where: {
        package_name: sim_card.bundle_id,
        deleted_at: IsNull(),
      },
    });

    const active_bundle = {
      plan: {
        id: plan.id,
        plan_name: plan.plan_name,
        countries: plan.countries,
        data: plan.data,
        validity: plan.validity,
        singleUse: plan.singleUse,
      },
      usage: {
        total_in_gb: this.kilobytesToGb(sim_card.allowed_usage_kb),
        remaining_in_gb: this.kilobytesToGb(sim_card.remaining_usage_kb),
        remaining_days: sim_card.remaining_days,
      },
    };

    return active_bundle;
  }

  async getAirAloIccidDetails(order: Orders) {
    const { data: Data } = await this._api.getAirAloBundleDetails(
      order.order_details.iccid,
    );

    const {
      plan_id: { plan_name, data, validity, singleUse },
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
        singleUse,
      },
      usage: {
        total_in_gb: this.megaBytesToGb(Data.total),
        remaining_in_gb: this.megaBytesToGb(Data.remaining),
        remaining_days: end_date > 0 ? end_date : null,
      },
    };

    return active_bundle;
  }

  async getRedTeaIccidDetials(order: Orders) {
    const payload = {
      iccid: order.order_details.iccid,
      pager: {
        pageNum: 1,
        pageSize: 20,
      },
    };

    const {
      obj: { esimList },
    } = await this._api.RedteaIccidDetails(payload);

    let end_date: any = -1;
    if (esimList[0]?.expiredTime) {
      end_date = moment(moment(esimList[0].expiredTime)).diff(
        new Date(),
        'days',
      );
    }

    const {
      plan_id: { plan_name, data, validity },
    } = order;

    const active_bundle = {
      plan: {
        plan_name,
        data,
        validity,
      },
      usage: {
        total_in_gb: this.bytesToGb(esimList[0].totalVolume),
        remaining_in_gb:
          end_date > 0 ? this.bytesToGb(esimList[0].orderUsage) : 0,
        remaining_days: end_date > 0 ? end_date : null,
      },
    };

    return active_bundle;
  }

  async getMobiMatterIccidDetails(order: Orders) {
    const {
      order_details: { iccid },
    } = order;

    const orderDetails = await this._api.mobiMatterOrderDetailsByIccid(iccid);
    console.log(orderDetails);

    const iccidusage: any = await this._api.mobiMatterIccidUsage(
      orderDetails.result.orderId,
    );
    console.log(iccidusage);

    if (!iccidusage?.packages[0]?.activationDate) {
      return {};
    }
    let end_date: any;
    if (iccidusage?.packages[0]?.expirationDate) {
      end_date = moment(moment(iccidusage?.packages[0]?.expirationDate)).diff(
        new Date(),
        'days',
      );
    }

    const {
      plan_id: { plan_name, data, validity },
    } = order;
    const active_bundle = {
      plan: {
        plan_name,
        data,
        validity,
      },
      usage: {
        total_in_gb: this.megaBytesToGb(
          iccidusage?.packages[0]?.totalAllowanceMb,
        ),
        remaining_in_gb: this.megaBytesToGb(iccidusage?.packages[0]?.usedMb),
        remaining_days: end_date > 0 ? end_date : null,
      },
    };

    return active_bundle;
  }

  async getAllPlansStatic(req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const plansCount = await this._assignPlanRepo.count({
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
      });

      const completedOrdersCount = await this._ordersRepo.count({
        where: {
          deleted_at: IsNull(),
          status: 'COMPLETED',
          wl_id: {
            id: wl_acount?.id,
          },
        },
      });

      const pendingOrdersCount = await this._ordersRepo.count({
        where: {
          deleted_at: IsNull(),
          status: 'PENDING',
          wl_id: {
            id: wl_acount?.id,
          },
        },
      });

      const cancelOrdersCount = await this._ordersRepo.count({
        where: {
          status: 'CANCELLED',
          wl_id: {
            id: wl_acount?.id,
          },
        },
      });

      const data = {
        allplans: plansCount,
        completedOrders: completedOrdersCount,
        pendingOrders: pendingOrdersCount,
        cancelOrders: cancelOrdersCount,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Plans Statics',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  spliteCode(qr_code: string) {
    let splitedCode = qr_code.split('$');
    return splitedCode;
  }

  bytesToGb(bytes: number) {
    const kb = bytes / 1000;
    const mb = kb / 1000;
    const gb = mb / 1000;
    return gb.toFixed(2);
  }

  kilobytesToGb(kb: number) {
    const mb = kb / 1000;
    const gb = mb / 1000;
    return gb.toFixed(2);
  }

  megaBytesToGb(mb: number) {
    const gb = mb / 1000;
    return gb.toFixed(2);
  }
}

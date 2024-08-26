import { map } from 'rxjs';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Orders } from 'src/entities/order.entity';
import { ResponseService } from 'src/shared/services/response.service';
import { In, IsNull, Like, Repository } from 'typeorm';
import {
  FilterOrderList,
  PaginationDto,
  StatusByOrderLstDto,
} from './orders.dto';
import { NodeMailService } from 'src/mail/node-mail.service';
import * as moment from 'moment';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { ApiService } from 'src/shared/services/api.service';
import { eSimPlans } from 'src/entities/esim_plan.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Orders) private readonly _ordersRepo: Repository<Orders>,
    @InjectRepository(TopUpHistory)
    private readonly _TopupRepo: Repository<TopUpHistory>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @InjectRepository(eSimPlans)
    private readonly _plansRepo: Repository<eSimPlans>,
    private _mailer: NodeMailService,
    @Inject('API-SERVICE') private _api: ApiService,
  ) {}

  async getAlleSimOrders(req: Request) {
    try {
      const orders = await this._ordersRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          order_details: true,
          wl_id: true,
          plan_id: true,
          transaction: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Orders List',
        orders,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllOrdersByStatus(query: StatusByOrderLstDto, req: Request) {
    try {
      const { vendor_id, status } = query;

      const orderList: any[] = await this._ordersRepo.find({
        where: {
          status: status,
          plan_id: {
            vendor: {
              id: parseInt(vendor_id),
            },
          },
        },
        relations: {
          order_details: true,
          plan_id: {
            vendor: true,
          },
          wl_id: true,
        },
        order: {
          id: 'DESC',
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Orders List',
        orderList,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllOrders(query: FilterOrderList, req: Request) {
    try {
      const { searchStr, wlId, start_date, end_date, orderType } = query;

      let allOrders: any[];

      const esimOrderQuery = `
                SELECT orders.id AS id, orders.order_id AS orderID, orders.created_at AS orderDate, od.iccid AS iccId, ep.plan_name AS planName, ep.data AS planData, ep.validity AS planValidity, wt.debit AS amount, wl.username AS whitelabel, vendor.name as vendorName, orders.status AS orderStatus FROM orders AS orders
                LEFT JOIN e_sim_plans AS ep ON ep.id = orders.plan_id
                LEFT JOIN vendors AS vendor ON vendor.id = ep.vendor_id
                LEFT JOIN order_details AS od ON od.id = orders.detial_id
                LEFT JOIN wl_account AS wl ON wl.id = orders.wl_id
                LEFT JOIN wallet_transaction AS wt ON wt.id = orders.trans_id
                WHERE orders.deleted_at IS NULL
            `;

      const topupOrderQuery = `
                SELECT topuph.id AS id, topuph.order_no AS orderID, topuph.created_at AS orderDate, topuph.iccid AS iccId, ep.plan_name AS planName, ep.data AS planData, ep.validity AS planValidity, wt.debit AS amount, wl.username AS whitelabel, vendor.name as vendorName,topuph.status AS orderStatus FROM top_up_history AS topuph
                LEFT JOIN e_sim_plans AS ep ON ep.id = topuph.plan_id
                LEFT JOIN vendors AS vendor ON vendor.id = ep.vendor_id
                LEFT JOIN wallet_transaction AS wt ON wt.id = topuph.wt_id
                LEFT JOIN wl_account AS wl ON wl.id = wt.wl_id
                WHERE topuph.deleted_at IS NULL
            `;

      if (parseInt(orderType) != 0) {
        if (parseInt(orderType) == 1) {
          if (start_date && end_date) {
            const esimOrders = await this._ordersRepo.query(`
                            ${esimOrderQuery} && orders.created_at BETWEEN '${start_date}' AND '${end_date}'
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
                            ${esimOrderQuery}
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
            const topupOrders = await this._TopupRepo.query(
              `${topupOrderQuery} && topuph.created_at BETWEEN '${start_date}' AND '${end_date}'
                            ORDER BY id DESC`,
            );
            allOrders = [];
            allOrders = [...topupOrders];
            return this.res.generateResponse(
              HttpStatus.OK,
              'Orders List',
              allOrders,
              req,
            );
          } else {
            const topupOrders = await this._TopupRepo.query(
              `${topupOrderQuery}
                            ORDER BY id DESC
                            
                        `,
            );
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
                        ${esimOrderQuery} && orders.created_at BETWEEN '${start_date}' AND '${end_date}'
                            ORDER BY id DESC
                        `);

          const topupOrders = await this._TopupRepo.query(`   
                        ${topupOrderQuery} && topuph.created_at BETWEEN '${start_date}' AND '${end_date}'
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
                        ${esimOrderQuery}
                            ORDER BY id DESC
                        `);

          const topupOrders = await this._TopupRepo.query(`   
                        ${topupOrderQuery}
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

        order = {
          orderType: 'topup',
          ...topupOrders,
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

        let orderPayload = {
          iccid: esimOrder.order_details.iccid,
          plan_id: { ...esimOrder.plan_id },
          vendorName: esimOrder.plan_id.vendor.name,
        };
        // console.log(orderPayload);

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

  async getAllOrdersByPagination(query: PaginationDto, req: Request) {
    try {
      const { page, pageSize, searchStr, filter } = query;

      let orders: Orders[];
      let count: number;

      if (parseInt(filter) == 0) {
        orders = await this._ordersRepo.find({
          where: [
            { deleted_at: IsNull(), order_id: Like(`%${searchStr}%`) },
            { deleted_at: IsNull(), status: Like(`%${searchStr}%`) },
            {
              deleted_at: IsNull(),
              order_details: { iccid: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              order_details: { qr_code: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              order_details: { data_roaming: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              order_details: { apn: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              order_details: { package_name: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              plan_id: { plan_name: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              wl_id: { username: Like(`%${searchStr}%`) },
            },
            { deleted_at: IsNull(), wl_id: { email: Like(`%${searchStr}%`) } },
          ],
          relations: {
            order_details: true,
            wl_id: true,
            plan_id: true,
            transaction: true,
          },
          order: {
            id: 'DESC',
          },
          skip: (parseInt(page) - 1) * parseInt(pageSize),
          take: parseInt(pageSize),
        });

        count = await this._ordersRepo.count({
          where: [
            { deleted_at: IsNull(), order_id: Like(`%${searchStr}%`) },
            { deleted_at: IsNull(), status: Like(`%${searchStr}%`) },
            {
              deleted_at: IsNull(),
              order_details: { iccid: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              order_details: { qr_code: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              order_details: { data_roaming: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              order_details: { apn: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              order_details: { package_name: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              plan_id: { plan_name: Like(`%${searchStr}%`) },
            },
            {
              deleted_at: IsNull(),
              wl_id: { username: Like(`%${searchStr}%`) },
            },
            { deleted_at: IsNull(), wl_id: { email: Like(`%${searchStr}%`) } },
          ],
          relations: {
            order_details: true,
            wl_id: true,
            plan_id: true,
            transaction: true,
          },
          order: {
            id: 'DESC',
          },
        });
      } else {
        orders = await this._ordersRepo.find({
          where: [
            {
              deleted_at: IsNull(),
              order_id: Like(`%${searchStr}%`),
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              status: Like(`%${searchStr}%`),
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { iccid: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { qr_code: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { data_roaming: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { apn: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { package_name: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              plan_id: { plan_name: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              wl_id: { username: Like(`%${searchStr}%`), id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              wl_id: { email: Like(`%${searchStr}%`), id: parseInt(filter) },
            },
          ],
          relations: {
            order_details: true,
            wl_id: true,
            plan_id: true,
            transaction: true,
          },
          order: {
            id: 'DESC',
          },
          skip: (parseInt(page) - 1) * parseInt(pageSize),
          take: parseInt(pageSize),
        });

        count = await this._ordersRepo.count({
          where: [
            {
              deleted_at: IsNull(),
              order_id: Like(`%${searchStr}%`),
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              status: Like(`%${searchStr}%`),
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { iccid: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { qr_code: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { data_roaming: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { apn: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              order_details: { package_name: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              plan_id: { plan_name: Like(`%${searchStr}%`) },
              wl_id: { id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              wl_id: { username: Like(`%${searchStr}%`), id: parseInt(filter) },
            },
            {
              deleted_at: IsNull(),
              wl_id: { email: Like(`%${searchStr}%`), id: parseInt(filter) },
            },
          ],
          relations: {
            order_details: true,
            wl_id: true,
            plan_id: true,
            transaction: true,
          },
          order: {
            id: 'DESC',
          },
        });
      }

      const data = {
        list: orders,
        total_count: count,
        page,
        pageSize,
        filter,
      };

      return this.res.generateResponse(HttpStatus.OK, 'Orders List', data, req);
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async reSendEmail(id: string, req: Request) {
    try {
      const ORDER = await this._ordersRepo.findOne({
        where: {
          id: parseInt(id),
          deleted_at: IsNull(),
          status: 'COMPLETED',
        },
        relations: {
          wl_id: true,
          order_details: true,
          plan_id: true,
          transaction: true,
        },
      });

      if (!ORDER) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Order might be cancelled or pending right now!',
          [],
          req,
        );
      }

      const emailData = {
        to: ORDER.wl_id.email,
        customer_name: ORDER.wl_id.username,
        order_id: ORDER.order_id,
        order_date: moment(ORDER.created_at).format('MMMM Do YYYY'),
        iccid: ORDER.order_details.iccid,
        apn: ORDER.order_details.apn,
        dataRoaming: ORDER.order_details.data_roaming,
        paymentType: 'Wallet',
        email: ORDER.wl_id.email,
        packageData: ORDER.plan_id.data,
        packageValidity: ORDER.plan_id.validity,
        planName: ORDER.plan_id.plan_name,
        payment: ORDER.transaction?.debit,
        iosAddress: this.spliteCode(ORDER.order_details.qr_code)[1],
        iosURL: this.spliteCode(ORDER.order_details.qr_code)[2],
        qrCodeString: ORDER.order_details.qr_code,
        qr_url: ORDER.order_details.qrcode_url,
      };

      await this._mailer.sendOrderEmail(emailData);

      return this.res.generateResponse(
        HttpStatus.OK,
        `Email sent to ${ORDER.wl_id.username}`,
        [],
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

  async selectVendor(order: any) {
    let ret: any;
    switch (order.vendorName) {
      case 'esim-go':
        ret = await this.getEsimGoIccidDetails(order);
        console.log(ret);
        break;
      case 'keepgo':
        ret = await this.getKeepGoIccidDetails(order);
        console.log(ret);
        break;
      case 'Airalo':
        ret = await this.getAirAloIccidDetails(order);
        console.log(ret);
        break;
      case 'Mobi-Matter':
        ret = await this.getMobiMatterIccidDetails(order);
        console.log(ret);
        break;
      default:
        ret = order;
        break;
    }
    return ret;
  }

  async getEsimGoIccidDetails(order: any) {
    let active_bundle: any = {};
    const { bundles } = await this._api.getBundleDetail(order.iccid);
    // console.log(bundles);
    if (bundles.length) {
      const { assignments, name } = bundles[bundles.length - 1];
      // console.log('plan name ', name)
      const plan = await this._plansRepo.findOne({
        where: {
          package_name: name,
          deleted_at: IsNull(),
        },
      });

      // console.log("plan", plan);

      let end_date: any;
      if (assignments[0]?.endTime) {
        end_date = moment(moment(assignments[0]?.endTime)).diff(
          new Date(),
          'days',
        );
      }

      const queuePackages: any[] = bundles.map((element: any) => {
        const { name, assignments } = element;
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

    // console.log(active_bundle)
    return active_bundle;
  }

  async getMobiMatterIccidDetails(order: any) {
    const { iccid } = order;

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

    // console.log(active_bundle)
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

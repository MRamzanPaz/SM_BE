import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from 'src/entities/order.entity';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { ResponseService } from 'src/shared/services/response.service';
import { Between, IsNull, Repository } from 'typeorm';
import { GPRDto } from './report.dto';
import { Request } from 'express';
import { ApiService } from 'src/shared/services/api.service';
import fs from 'fs';
import { OrderDetails } from 'src/entities/order_details.entity';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';
import * as moment from 'moment';
import * as _ from 'lodash';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Orders) private readonly _ordersRepo: Repository<Orders>,
    @InjectRepository(TopUpHistory)
    private readonly _topupRepo: Repository<TopUpHistory>,
    @InjectRepository(OrderDetails)
    private readonly _ordersDetailRepo: Repository<OrderDetails>,
    @InjectRepository(VendorsOrder)
    private readonly _vendorOrderRepo: Repository<VendorsOrder>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
  ) {}

  async generateGrossProfitReport(body: GPRDto, req: Request) {
    try {
      const { type, ...filters } = body;

      console.log(body);

      const data = await this.generateReport(type, filters);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Gross Profit Report',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async setupGrossProfitReport(req: Request) {
    try {
      await this.setupEsimgo();
      await this.setupAirAlo();
      await this.setupRedTea();

      return 'ok';
    } catch (error) {
      console.log(error);
    }
  }

  async generateReport(type: string, filter: GPRDto) {
    try {
      let report: any = [];
      switch (type) {
        case 'ALL':
          report = await this.grossProfitForAll(filter);
          break;
        case 'ORDERS':
          report = await this.grossProfitForOrders(filter);
          break;
        case 'TOPUP':
          report = await this.grossProfitForTopup(filter);
          break;
        default:
          break;
      }
      return report;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async grossProfitForAll(filter: GPRDto) {
    try {
      let orderQuery: string = this.getQueryForOrder(filter);
      let topupQuery: string = this.getQueryForTopup(filter);

      const ordersReport = await this._ordersRepo.query(orderQuery);
      const topupReport = await this._ordersRepo.query(topupQuery);

      const data: any[] = [...ordersReport, ...topupReport];

      return _.orderBy(data, 'order_date', 'desc');
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async grossProfitForOrders(filter: GPRDto) {
    try {
      let orderQuery: string = this.getQueryForOrder(filter);

      const ordersReport = await this._ordersRepo.query(orderQuery);

      const data: any[] = [...ordersReport];

      return data;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async grossProfitForTopup(filter: GPRDto) {
    try {
      let topupQuery: string = this.getQueryForTopup(filter);
      const topupReport = await this._ordersRepo.query(topupQuery);

      const data: any[] = [...topupReport];

      return data;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  getQueryForOrder(filter: GPRDto): string {
    const { wl_id, end_date, start_date, vendor_id } = filter;
    let query: string = `
        SELECT (o.created_at) AS order_date, (order_id) AS order_no, od.iccid AS iccid, plan_name, DATA, v.name AS vendor , wl.username AS whitelabel ,validity, vo.cost_price ,(t.debit) AS selling_price, (t.debit - vo.cost_price ) AS gross_profit FROM orders AS o 
        LEFT JOIN wallet_transaction AS t ON o.trans_id = t.id
        LEFT JOIN e_sim_plans AS ep ON o.plan_id = ep.id
        LEFT JOIN vendors AS v ON ep.vendor_id = v.id
        LEFT JOIN order_details AS od ON o.detial_id = od.id
        LEFT JOIN vendors_order AS vo ON od.vo_id = vo.id
        LEFT JOIN wl_account AS wl ON t.wl_id = wl.id 
        WHERE o.status = 'COMPLETED' AND o.deleted_at IS NULL AND od.vo_id IS NOT NULL`;

    query = wl_id ? query + ` AND o.wl_id = ${wl_id}` : query + '';
    query = vendor_id ? query + ` AND ep.vendor_id = ${vendor_id}` : query + '';
    query =
      end_date && start_date
        ? query + ` AND o.created_at BETWEEN '${start_date}' AND '${end_date}'`
        : query + '';
    query =
      !end_date && start_date
        ? query + ` AND o.created_at >= '${start_date}'`
        : query + '';
    query =
      end_date && !start_date
        ? query + ` AND o.created_at <= '${start_date}'`
        : query + '';

    // sort data with order date
    query = query + '\nORDER BY order_date DESC';
    return query;
  }

  getQueryForTopup(filter: GPRDto): string {
    const { wl_id, end_date, start_date, vendor_id } = filter;

    let query: string = `
        SELECT (tph.created_at) AS order_date, order_no, tph.iccid, plan_name, data, v.name AS vendor , wl.username AS whitelabel ,validity, vo.cost_price, (t.debit) AS selling_price, (t.debit - vo.cost_price ) AS gross_profit FROM top_up_history AS tph
        LEFT JOIN e_sim_plans AS ep ON tph.plan_id = ep.id
        LEFT JOIN wallet_transaction AS t ON tph.wt_id = t.id
        LEFT JOIN vendors AS v ON ep.vendor_id = v.id
        LEFT JOIN vendors_order AS vo ON tph.vo_id = vo.id
        LEFT JOIN wl_account AS wl ON t.wl_id = wl.id
        WHERE tph.status = 'COMPLETED' AND tph.deleted_at IS NULL AND tph.vo_id IS NOT NULL`;

    query = wl_id ? query + ` AND t.wl_id = ${wl_id}` : query + '';
    query = vendor_id ? query + ` AND ep.vendor_id = ${vendor_id}` : query + '';
    query =
      end_date && start_date
        ? query +
          ` AND tph.created_at BETWEEN '${start_date}' AND '${end_date}'`
        : query + '';
    query =
      !end_date && start_date
        ? query + ` AND tph.created_at >= '${start_date}'`
        : query + '';
    query =
      end_date && !start_date
        ? query + ` AND tph.created_at <= '${start_date}'`
        : query + '';

    // sort data with order date
    query = query + '\nORDER BY order_date DESC';
    return query;
  }

  async setupEsimgo() {
    let count = 304;

    let finaleArry = [];

    for (let index = 1; index <= count; index++) {
      const response = await this._api.getEsimGoPastOrders(true, index);
      // console.log(response);
      const orders: any[] = response.orders;
      finaleArry = [...finaleArry, ...orders];
      console.log('====', index);
      // console.log(JSON.stringify(response));
    }

    // return finaleArry;

    for (let index = 0; index < finaleArry.length; index++) {
      if (finaleArry[index]?.order) {
        if (finaleArry[index]?.order[0]?.esims) {
          const iccid = finaleArry[index]?.order[0]?.esims[0]?.iccid;
          if (iccid) {
            const isExsist = await this._ordersDetailRepo.findOne({
              where: {
                iccid: iccid,
                vendors_order: IsNull(),
              },
            });

            if (isExsist) {
              const payload = {
                iccid: iccid,
                reference: finaleArry[index]?.orderReference,
                cost_price: finaleArry[index]?.order[0]?.pricePerUnit,
                package: isExsist.package_name,
              };
              console.log(payload);
              const row = this._vendorOrderRepo.create(payload);
              await this._vendorOrderRepo.save(row);

              await this._ordersDetailRepo
                .createQueryBuilder()
                .update()
                .set({
                  vendors_order: row,
                })
                .where('iccid = :iccid', { iccid: iccid })
                .execute();
            } else {
              console.log('this is not exsist: ', iccid);
              console.log(JSON.stringify(finaleArry[index]));
            }
          }
        } else {
          if (finaleArry[index]?.order[0]?.type == 'bundle') {
            const Package: any = finaleArry[index]?.order[0]?.item;
            const orderDate = moment
              .utc(finaleArry[index].createdDate)
              .format('YYYY-MM-DD');

            const topup = await this._topupRepo.findOne({
              where: {
                created_at: Between(
                  new Date(`${orderDate} 00:00:00`),
                  new Date(`${orderDate} 23:59:59`),
                ),
                plan: [
                  {
                    package_name: Package,
                  },
                  {
                    package_name: Package.replace('esimg', 'esimgnr'),
                  },
                ],
                vendors_order: IsNull(),
              },
            });

            if (topup) {
              const payload = {
                iccid: topup.iccid,
                reference: finaleArry[index]?.orderReference,
                cost_price: finaleArry[index]?.order[0]?.pricePerUnit,
                package: Package,
              };

              console.log(payload);
              const row = this._vendorOrderRepo.create(payload);
              await this._vendorOrderRepo.save(row);

              await this._topupRepo
                .createQueryBuilder()
                .update()
                .set({
                  vendors_order: row,
                })
                .where('id = :id', { id: topup.id })
                .execute();
            }
          }
        }
      }
    }
  }

  async setupAirAlo() {
    let count = 2;
    let finalArray: any[] = [];
    for (let index = 1; index <= count; index++) {
      const response = await this._api.getAirAloPastOrders(index, 100, 'sims');
      finalArray = [...finalArray, ...response.data];
    }

    // return finalArray

    for (let index = 0; index < finalArray.length; index++) {
      const order = finalArray[index];

      if (order.type == 'sim') {
        const { id, price, sims } = order;

        const ORDER = await this._ordersDetailRepo.findOne({
          where: {
            vendors_order: IsNull(),
            iccid: sims[0]?.iccid,
          },
        });

        if (ORDER) {
          const payload = {
            iccid: sims[0]?.iccid,
            reference: `${id}`,
            cost_price: price,
            package: ORDER.package_name,
          };
          // console.log(payload);
          const row = this._vendorOrderRepo.create(payload);
          await this._vendorOrderRepo.save(row);

          await this._ordersDetailRepo
            .createQueryBuilder()
            .update()
            .set({
              vendors_order: row,
            })
            .where('id = :id', { id: ORDER.id })
            .execute();
        }
      } else {
        const { id, price, package_id } = order;
        const convertedPackageID = package_id.replace('-topup', '');

        const topup = await this._topupRepo.findOne({
          where: {
            plan: {
              package_name: convertedPackageID,
            },
            vendors_order: IsNull(),
          },
        });

        if (topup) {
          const payload = {
            iccid: topup.iccid,
            reference: id,
            cost_price: price,
            package: convertedPackageID,
          };

          console.log(payload);
          const row = this._vendorOrderRepo.create(payload);
          await this._vendorOrderRepo.save(row);

          await this._topupRepo
            .createQueryBuilder()
            .update()
            .set({
              vendors_order: row,
            })
            .where('id = :id', { id: topup.id })
            .execute();
        }
      }
    }
  }

  async setupRedTea() {
    const payload = {
      pager: {
        pageSize: 100,
        pageNum: 1,
      },
    };
    const response = await this._api.getRedTeaPastOrders(payload);

    const dataArr: any[] = response.obj.esimList;

    // return dataArr;

    // const PAYLOAD = {
    //     // packageCode: dataArr[index].packageList[0].packageCode
    //     // iccid :ORDER.iccid
    // }
    // const _package = await this._api.getRedTeaPackage(PAYLOAD)

    // return _package

    for (let index = 0; index < dataArr.length; index++) {
      const ORDER = await this._ordersDetailRepo.findOne({
        where: {
          iccid: dataArr[index].iccid,
          // vendors_order: IsNull()
        },
      });

      if (ORDER) {
        const PAYLOAD = {
          packageCode: dataArr[index].packageList[0].packageCode,
          // iccid :ORDER.iccid
        };
        const _package = await this._api.getRedTeaPackage(PAYLOAD);

        if (_package.obj.packageList[0]?.price) {
          const payload = {
            iccid: ORDER.iccid,
            reference: dataArr[index].orderNo,
            cost_price: _package.obj.packageList[0]?.price / 10000,
            package: dataArr[index].packageList[0].packageCode,
          };

          const row = this._vendorOrderRepo.create(payload);
          await this._vendorOrderRepo.save(row);

          await this._ordersDetailRepo
            .createQueryBuilder()
            .update()
            .set({
              vendors_order: row,
            })
            .where('iccid = :iccid', { iccid: ORDER.iccid })
            .execute();
        } else {
          console.log(dataArr[index]);
          console.log('================');
          console.log(dataArr[index].packageList[0].packageCode);
          console.log('================');
          // console.log(_package);
        }
      }
    }
  }
}

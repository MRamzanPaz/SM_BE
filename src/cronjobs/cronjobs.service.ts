import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from 'src/entities/order.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { NodeMailService } from 'src/mail/node-mail.service';
import { ApiService } from 'src/shared/services/api.service';
import { ResponseService } from 'src/shared/services/response.service';
import { IsNull, Like, Repository } from 'typeorm';

@Injectable()
export class CronjobsService {
  constructor(
    private _mailer: NodeMailService,
    @InjectRepository(Orders) private readonly _ordersRepo: Repository<Orders>,
    @InjectRepository(OrderDetails)
    private readonly _ordersDetailRepo: Repository<OrderDetails>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
  ) {}

  // send usage notification on airalo

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // @Cron(CronExpression.EVERY_SECOND)
  async sendNotificationAiralo() {
    try {
      if (process.env.SCHEDULER == 'ON') {
        const airaloCustomers: Orders[] = await this._ordersRepo.find({
          where: {
            status: 'COMPLETED',
            plan_id: {
              vendor: {
                name: Like('airalo'),
                deleted_at: IsNull(),
              },
            },
          },
          relations: {
            wl_id: true,
            order_details: true,
          },
        });

        for (const customers of airaloCustomers) {
          const usages: any = await this._api.airaloGetDataUsage(
            customers.order_details.iccid,
          );
          console.log(usages);
          if (!usages?.error) {
            const { remaining, total } = usages;
            const usedGbs = total - remaining;

            const remainingGB = (remaining / 1024).toFixed(2);
            const totalGB = (total / 1024).toFixed(2);

            let usagePercentage: number | any = (usedGbs * 100) / total;
            usagePercentage = usagePercentage.toFixed(0);

            if (isNaN(usagePercentage)) {
              usagePercentage = 0;
            }

            let message = '';

            let message1 = `Dear Customer, you've consumed ${usagePercentage}% already.
                \n
                ICCID: ${customers.order_details.iccid}
                \n`;
            let message2 =
              customers.wl_id.id == 2
                ? `You can top up by logging into the site: https://travelnet.world/account/login \n`
                : '';

            let message3 = `Safe travels\n`;

            message = message1 + message2 + message3;

            const mailerObj = {
              to: customers.wl_id.email,
              wl_name: customers.wl_id.username,
              message: message,
            };

            await this._mailer.sendUsageEmail(mailerObj);
          }
        }
      }
    } catch (error) {
      this.res.generateError(error);
    }
  }
}

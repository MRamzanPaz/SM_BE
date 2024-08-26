import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TopupController } from './topup.controller';
import { TopupService } from './topup.service';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { Orders } from 'src/entities/order.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { NodeMailModule } from 'src/mail/node-mail.module';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      eSimPlans,
      AssignPlanToWl,
      TopUpHistory,
      Orders,
      Wallet_Transaction,
      Wl_Account,
      ActivatedESims,
      VendorsOrder,
    ]),
    SharedModule,
    NodeMailModule,
  ],
  controllers: [TopupController],
  providers: [
    {
      provide: 'TOPUP-SERVICE',
      useClass: TopupService,
    },
  ],
})
export class TopupModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessMiddleware).forRoutes(
      {
        path: 'topup',
        method: RequestMethod.GET,
      },
      {
        path: 'topup/pagination',
        method: RequestMethod.POST,
      },
      {
        path: 'topup/rechargeable/esim-list',
        method: RequestMethod.GET,
      },
      {
        path: 'topup/packages/:iccid',
        method: RequestMethod.GET,
      },
      {
        path: 'topup/apply',
        method: RequestMethod.POST,
      },
    );

    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'topup/admin/list',
        method: RequestMethod.GET,
      },
      {
        path: 'topup/admin/adjust',
        method: RequestMethod.POST,
      },
      {
        path: 'topup/admin/rechargeable/esim-list/:wl_id',
        method: RequestMethod.GET,
      },
      {
        path: 'topup/admin/country_list',
        method: RequestMethod.GET,
      },
    );
  }
}

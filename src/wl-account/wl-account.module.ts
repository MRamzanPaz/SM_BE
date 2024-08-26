/* eslint-disable prettier/prettier */
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { WlAccountService } from './wl-account.service';
import { WlAccountController } from './wl-account.controller';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { Orders } from 'src/entities/order.entity';
import { NodeMailModule } from 'src/mail/node-mail.module';
import { Inventory } from 'src/entities/inventory.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wl_Account,
      eSimPlans,
      AssignPlanToWl,
      Wallet_Transaction,
      Orders,
      Inventory,
      OrderDetails,
      TopUpHistory,
      VendorsOrder,
    ]),
    SharedModule,
    NodeMailModule,
  ],
  providers: [
    {
      provide: 'WL-SERVICE',
      useClass: WlAccountService,
    },
  ],
  controllers: [WlAccountController],
})
export class WlAccountModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'wl-account/create',
        method: RequestMethod.POST,
      },
      {
        path: 'wl-account/all',
        method: RequestMethod.GET,
      },
      {
        path: 'wl-account/plan/assign',
        method: RequestMethod.POST,
      },
      {
        path: 'wl-account/plan/unassign',
        method: RequestMethod.POST,
      },
      {
        path: 'wl-account/plan/purchase',
        method: RequestMethod.POST,
      },
      {
        path: 'wl-account/update',
        method: RequestMethod.POST,
      },
      {
        path: 'wl-account/update/status',
        method: RequestMethod.POST,
      },
      {
        path: 'wl-account/all/unassignPlans/:wl_id',
        method: RequestMethod.GET,
      },
      {
        path: 'wl-account/all/wholesaleAssignPlans/:wl_id',
        method: RequestMethod.GET,
      },
      {
        path: 'wl-account/all/retailAssignPlans/:wl_id',
        method: RequestMethod.GET,
      },
      {
        path: 'wl-account/set/planPricing',
        method: RequestMethod.POST,
      },
    );

    // consumer
    //   .apply(AccessMiddleware)
    //   .forRoutes({
    //     path: 'wl-account/update',
    //     method: RequestMethod.POST
    //   })
  }
}

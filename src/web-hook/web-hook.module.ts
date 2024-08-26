import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { WebHookController } from './web-hook.controller';
import { WebHookService } from './web-hook.service';
import { SharedModule } from 'src/shared/shared.module';
import { NodeMailModule } from 'src/mail/node-mail.module';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import { Orders } from 'src/entities/order.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { ShopifyWebHooks } from 'src/entities/shopifyWebHook.entity';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      eSimPlans,
      AssignPlanToWl,
      Orders,
      OrderDetails,
      Wl_Account,
      Inventory,
      Wallet_Transaction,
      ActivatedESims,
      ShopifyWebHooks,
      VendorsOrder,
    ]),
    SharedModule,
    NodeMailModule,
  ],
  controllers: [WebHookController],
  providers: [
    {
      provide: 'WEBHOOK-SERVICE',
      useClass: WebHookService,
    },
  ],
})
// export class WebHookModule implements NestModule {
//
// configure(consumer: MiddlewareConsumer) {
// consumer
// .apply(AccessMiddleware)
// .forRoutes({
// path: 'web-hook/shopify',
// method: RequestMethod.POST
// })
//
// }
//
// }
export class WebHookModule {}

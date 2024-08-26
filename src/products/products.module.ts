import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RbPlansService } from './products.service';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import { Countries } from 'src/entities/country.entity';
import { ProductsController } from './products.controller';
import { Orders } from 'src/entities/order.entity';
import { Vendors } from 'src/entities/vendors.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { NodeMailModule } from 'src/mail/node-mail.module';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      eSimPlans,
      TopUpHistory,
      AssignPlanToWl,
      Countries,
      Orders,
      OrderDetails,
      Vendors,
      Wl_Account,
      Inventory,
      Wallet_Transaction,
      ActivatedESims,
      VendorsOrder,
    ]),
    SharedModule,
    NodeMailModule,
  ],
  controllers: [ProductsController],
  providers: [
    {
      provide: 'PLAN-SERVICE',
      useClass: RbPlansService,
    },
  ],
})
export class ProductModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessMiddleware).forRoutes(ProductsController);
  }
}

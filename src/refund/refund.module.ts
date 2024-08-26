import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundActivities } from 'src/entities/refundActivity.entity';
import { SharedModule } from 'src/shared/shared.module';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { OrdersController } from 'src/orders/orders.controller';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';
import { NodeMailModule } from 'src/mail/node-mail.module';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { Orders } from 'src/entities/order.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefundActivities,
      Wl_Account,
      Orders,
      Wallet_Transaction,
    ]),
    SharedModule,
    NodeMailModule,
  ],
  controllers: [RefundController],
  providers: [
    {
      provide: 'REFUND-SERVICE',
      useClass: RefundService,
    },
  ],
})
export class RefundModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessMiddleware).forRoutes(
      {
        path: 'refund/partner/request',
        method: RequestMethod.POST,
      },
      {
        path: 'refund/partner/cancel/:id',
        method: RequestMethod.PUT,
      },
      {
        path: 'refund/partner/get/all',
        method: RequestMethod.GET,
      },
      {
        path: 'refund/partner/check/:order_id',
        method: RequestMethod.GET,
      },
    );

    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'refund/admin/accept',
        method: RequestMethod.POST,
      },
      {
        path: 'refund/admin/reject',
        method: RequestMethod.POST,
      },
      {
        path: 'refund/admin/get/all',
        method: RequestMethod.GET,
      },
    );
  }
}

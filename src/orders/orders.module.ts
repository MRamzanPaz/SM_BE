import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orders } from 'src/entities/order.entity';
import { SharedModule } from 'src/shared/shared.module';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { InventoryController } from 'src/inventory/inventory.controller';
import { NodeMailModule } from 'src/mail/node-mail.module';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { OrderDetails } from 'src/entities/order_details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Orders, TopUpHistory, eSimPlans, OrderDetails]),
    SharedModule,
    NodeMailModule,
  ],
  controllers: [OrdersController],
  providers: [
    {
      provide: 'ORDERS-SERVICE',
      useClass: OrdersService,
    },
  ],
})
export class OrdersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(OrdersController);
  }
}

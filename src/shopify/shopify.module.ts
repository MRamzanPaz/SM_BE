import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { ShopifyWebHooks } from 'src/entities/shopifyWebHook.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';
import { Orders } from 'src/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopifyWebHooks, Wl_Account, Orders]),
    SharedModule,
  ],
  controllers: [ShopifyController],
  providers: [
    {
      provide: 'SHOPIFY-SERVICE',
      useClass: ShopifyService,
    },
  ],
})
export class ShopifyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'shopify',
        method: RequestMethod.POST,
      },
      {
        path: 'shopify',
        method: RequestMethod.GET,
      },
    );

    consumer.apply(AccessMiddleware).forRoutes({
      path: 'shopify/orders/:order_id',
      method: RequestMethod.GET,
    });
  }
}

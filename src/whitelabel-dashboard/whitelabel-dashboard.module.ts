import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { WhitelabelDashboardController } from './whitelabel-dashboard.controller';
import { WhitelabelDashboardService } from './whitelabel-dashboard.service';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { Orders } from 'src/entities/order.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';
import { ProductsController } from 'src/products/products.controller';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { Countries } from 'src/entities/country.entity';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivatedESims,
      Orders,
      OrderDetails,
      eSimPlans,
      TopUpHistory,
      Countries,
      AssignPlanToWl,
    ]),
    SharedModule,
  ],
  controllers: [WhitelabelDashboardController],
  providers: [
    {
      provide: 'DASHBOARD-SERVICE',
      useClass: WhitelabelDashboardService,
    },
  ],
})
export class WhitelabelDashboardModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessMiddleware).forRoutes(WhitelabelDashboardController);
  }
}

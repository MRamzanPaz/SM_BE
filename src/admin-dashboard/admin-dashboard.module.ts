import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { OrderDetails } from 'src/entities/order_details.entity';
import { Orders } from 'src/entities/order.entity';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivatedESims,
      Orders,
      OrderDetails,
      eSimPlans,
      TopUpHistory,
    ]),
    SharedModule,
  ],
  controllers: [AdminDashboardController],
  providers: [
    {
      provide: 'ADMIN-SERVICE',
      useClass: AdminDashboardService,
    },
  ],
})
export class AdminDashboardModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(AdminDashboardController);
  }
}

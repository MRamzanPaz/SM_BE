import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { Orders } from 'src/entities/order.entity';
import { TopUpHistory } from 'src/entities/topupHistory.entity';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { InventoryController } from 'src/inventory/inventory.controller';
import { OrderDetails } from 'src/entities/order_details.entity';
import { VendorsOrder } from 'src/entities/vendorOrders.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Orders,
      TopUpHistory,
      OrderDetails,
      VendorsOrder,
    ]),
    SharedModule,
  ],
  controllers: [ReportController],
  providers: [
    {
      provide: 'REPORT-SERVICE',
      useClass: ReportService,
    },
  ],
})
export class ReportModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ReportController);
  }
}

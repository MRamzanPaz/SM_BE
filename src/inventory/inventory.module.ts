import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from 'src/entities/inventory.entity';
import { Vendors } from 'src/entities/vendors.entity';
import { ChoicePlans } from 'src/entities/choicePlans.entity';
import { eSimPlans } from 'src/entities/esim_plan.entity';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([Inventory, Vendors, ChoicePlans, eSimPlans]),
  ],
  controllers: [InventoryController],
  providers: [
    {
      provide: 'INVENTORY-SERVICE',
      useClass: InventoryService,
    },
  ],
})
export class InventoryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(InventoryController);
  }
}

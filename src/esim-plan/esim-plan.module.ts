import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EsimPlanController } from './esim-plan.controller';
import { EsimPlanService } from './esim-plan.service';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { Vendors } from 'src/entities/vendors.entity';
import { Countries } from 'src/entities/country.entity';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([eSimPlans, Vendors, Countries, AssignPlanToWl]),
    SharedModule,
  ],
  controllers: [EsimPlanController],
  providers: [
    {
      provide: 'ESIM-SERVICE',
      useClass: EsimPlanService,
    },
  ],
})
export class EsimPlanModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(EsimPlanController);
  }
}

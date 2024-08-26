import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ActivateEsimController } from './activate-esim.controller';
import { ActivateEsimService } from './activate-esim.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivatedESims, Wl_Account]),
    SharedModule,
  ],
  controllers: [ActivateEsimController],
  providers: [
    {
      provide: 'ACTIVATE-ESIM-SERVICE',
      useClass: ActivateEsimService,
    },
  ],
})
export class ActivateEsimModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ActivateEsimController);
  }
}

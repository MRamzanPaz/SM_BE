import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendors } from 'src/entities/vendors.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vendors]), SharedModule],
  controllers: [VendorController],
  providers: [
    {
      provide: 'VENDOR-SERVICE',
      useClass: VendorService,
    },
  ],
})
export class VendorModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(VendorController);
  }
}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Regions } from 'src/entities/region.entity';
import { Countries } from 'src/entities/country.entity';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Regions, Countries])],
  controllers: [RegionController],
  providers: [
    {
      provide: 'REGION-SERVICE',
      useClass: RegionService,
    },
  ],
})
export class RegionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(RegionController);
  }
}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { VendorController } from 'src/vendor/vendor.controller';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Countries } from 'src/entities/country.entity';
import { States } from 'src/entities/states.entity';
import { Cities } from 'src/entities/cities.entity';
import { xcities } from 'src/entities/xcities.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Countries, States, Cities]),
    SharedModule,
  ],
  controllers: [CountriesController],
  providers: [
    {
      provide: 'COUNTRY-SERVICE',
      useClass: CountriesService,
    },
  ],
})
export class CountriesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(CountriesController);
  }
}

/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import { VendorModule } from './vendor/vendor.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { MorganInterceptor, MorganModule } from 'nest-morgan';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WlAccountModule } from './wl-account/wl-account.module';
import { CountriesModule } from './countries/countries.module';
import { EsimPlanModule } from './esim-plan/esim-plan.module';
import { RegionModule } from './region/region.module';
import { InventoryModule } from './inventory/inventory.module';
import entities from './entities';
import { ProductModule } from './products/products.module';
import { WalletModule } from './wallet/wallet.module';
import { WebHookModule } from './web-hook/web-hook.module';
import { join } from 'path';
import { NodeMailModule } from './mail/node-mail.module';
import { CronjobsModule } from './cronjobs/cronjobs.module';
import { TopupModule } from './topup/topup.module';
import { OrdersModule } from './orders/orders.module';
import { WhitelabelDashboardModule } from './whitelabel-dashboard/whitelabel-dashboard.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { ShopifyModule } from './shopify/shopify.module';
import { RefundModule } from './refund/refund.module';
import { ActivateEsimModule } from './activate-esim/activate-esim.module';
import { ReportModule } from './report/report.module';
import { DeviceModule } from './device/device.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [join(process.cwd(), '.env')],
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [...entities],
      synchronize: process.env.DATABASE_SYNC == 'on' ? true : false,
    }),
    SharedModule,
    VendorModule,
    UsersModule,
    MorganModule,
    WlAccountModule,
    CountriesModule,
    EsimPlanModule,
    RegionModule,
    InventoryModule,
    ProductModule,
    WalletModule,
    WebHookModule,
    NodeMailModule,
    CronjobsModule,
    TopupModule,
    OrdersModule,
    WhitelabelDashboardModule,
    AdminDashboardModule,
    ShopifyModule,
    RefundModule,
    ActivateEsimModule,
    ReportModule,
    DeviceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MorganInterceptor('combined'),
    },
  ],
})
export class AppModule {}

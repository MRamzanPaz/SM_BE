/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { GeneralService } from './services/general.service';
import { JwtService } from './services/jwt.service';
import { ResponseService } from './services/response.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Logs } from 'src/entities/logs.entity';
import { Users } from 'src/entities/users.entity';
import { ApiService } from './services/api.service';
import { HttpModule } from '@nestjs/axios';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { StripeService } from './services/stripe.service';
import { SlackService } from './services/slack.service';

@Module({
  imports: [TypeOrmModule.forFeature([Logs, Users, Wl_Account]), HttpModule],
  providers: [
    {
      provide: 'GENERAL-SERVICE',
      useClass: GeneralService,
    },
    {
      provide: 'RESPONSE-SERVICE',
      useClass: ResponseService,
    },
    {
      provide: 'JWT-SERVICE',
      useClass: JwtService,
    },
    {
      provide: 'API-SERVICE',
      useClass: ApiService,
    },
    {
      provide: 'STRIPE-SERVICE',
      useClass: StripeService,
    },
    {
      provide: 'SLACK-SERVICE',
      useClass: SlackService,
    },
  ],
  exports: [
    {
      provide: 'GENERAL-SERVICE',
      useClass: GeneralService,
    },
    {
      provide: 'RESPONSE-SERVICE',
      useClass: ResponseService,
    },
    {
      provide: 'JWT-SERVICE',
      useClass: JwtService,
    },
    {
      provide: 'API-SERVICE',
      useClass: ApiService,
    },
    {
      provide: 'STRIPE-SERVICE',
      useClass: StripeService,
    },
    {
      provide: 'SLACK-SERVICE',
      useClass: SlackService,
    },
  ],
})
export class SharedModule {}

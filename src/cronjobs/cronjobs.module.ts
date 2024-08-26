import { Module } from '@nestjs/common';
import { CronjobsService } from './cronjobs.service';
import { NodeMailModule } from 'src/mail/node-mail.module';
import { SharedModule } from 'src/shared/shared.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderDetails } from 'src/entities/order_details.entity';
import { Orders } from 'src/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderDetails, Orders]),
    NodeMailModule,
    SharedModule,
    ScheduleModule.forRoot(),
  ],
  providers: [CronjobsService],
})
export class CronjobsModule {}

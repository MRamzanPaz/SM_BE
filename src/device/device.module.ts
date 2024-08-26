import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { Devices } from 'src/entities/devices.entity';
import { AuthMiddleware } from 'src/shared/middleware/auth/auth.middleware';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([Devices]), SharedModule],
  controllers: [DeviceController],
  providers: [
    {
      provide: 'DEVICE-SERVICE',
      useClass: DeviceService,
    },
  ],
})
export class DeviceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'device',
        method: RequestMethod.POST,
      },
      {
        path: 'device',
        method: RequestMethod.GET,
      },
      {
        path: 'device/pagination',
        method: RequestMethod.GET,
      },
      {
        path: 'device',
        method: RequestMethod.PUT,
      },
      {
        path: 'device/setup',
        method: RequestMethod.POST,
      },
      {
        path: 'device',
        method: RequestMethod.DELETE,
      },
    );

    consumer.apply(AccessMiddleware).forRoutes(
      {
        path: 'device/list',
        method: RequestMethod.GET,
      },
      {
        path: 'device/list/:id',
        method: RequestMethod.GET,
      },
      {
        path: 'device/os/:os',
        method: RequestMethod.GET,
      },
    );
  }
}

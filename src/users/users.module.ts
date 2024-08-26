/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Users]), SharedModule],
  providers: [
    {
      provide: 'USER-SERVICE',
      useClass: UsersService,
    },
  ],
  controllers: [UsersController],
  exports: [
    {
      provide: 'USER-SERVICE',
      useClass: UsersService,
    },
  ],
})
export class UsersModule {}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { AccessMiddleware } from 'src/shared/middleware/access/access.middleware';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { Wallet_Transaction } from 'src/entities/wallet_transaction.entity';
import { NodeMailModule } from 'src/mail/node-mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wl_Account, Wallet_Transaction]),
    SharedModule,
    NodeMailModule,
  ],
  controllers: [WalletController],
  providers: [
    {
      provide: 'WALLET-SERVICE',
      useClass: WalletService,
    },
  ],
})
export class WalletModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessMiddleware).forRoutes(WalletController);
  }
}

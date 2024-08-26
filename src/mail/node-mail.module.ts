import { Module } from '@nestjs/common';
import { NodeMailService } from './node-mail.service';
import { SharedModule } from 'src/shared/shared.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLogs } from 'src/entities/emailLogs.entity';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forFeature([EmailLogs]),
    ConfigModule.forRoot(),
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: process.env.NODE_MAILER_HOST,
          port: 465,
          secure: true,
          auth: {
            user: process.env.NODE_MAILER_USER,
            pass: process.env.NODE_MAILER_PASS,
          },
        },
        defaults: {
          from: `<${process.env.NODE_MAILER_FROM}>`,
        },
        template: {
          dir: join(__dirname, '/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),

      inject: [ConfigService],
    }),
  ],
  providers: [NodeMailService],
  exports: [NodeMailService],
})
export class NodeMailModule {}

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import * as express from 'express';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

const httpsOptions: HttpsOptions = {
  // key: fs.readFileSync(join(process.cwd(), 'privkey.pem')),
  // cert: fs.readFileSync(join(process.cwd(), 'fullchain.pem')),
  rejectUnauthorized: false,
  requestCert: true,
};

const server = express();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { cors: true },
  );

  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe());
  app.useStaticAssets(join(__dirname, '..', 'qr-codes'));

  await app.init();

  http
    .createServer(server)
    .listen(parseInt(process.env.PORT) || 3000, '0.0.0.0', function () {
      console.log(`listening on port 3000 without ssl`);
    });
  https.createServer(httpsOptions, server).listen(3001, '0.0.0.0', function () {
    console.log(`listening on port 3001 with ssl`);
  });
}

bootstrap();

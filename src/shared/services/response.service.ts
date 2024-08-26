/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-empty-function */
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Response,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Logs } from 'src/entities/logs.entity';
import { Repository } from 'typeorm';
import { ApiService } from './api.service';
import { SlackService } from './slack.service';

@Injectable()
export class ResponseService {
  constructor(
    @InjectRepository(Logs)
    private readonly _logsRepo: Repository<Logs>,
    @Inject('API-SERVICE') private _api: ApiService,
    @Inject('SLACK-SERVICE') private _slack: SlackService,
  ) {}

  generateResponse(code: any, msg: string, data: any, req: Request) {
    try {
      const { originalUrl } = req;
      const payload = {
        message: msg,
        isError: false,
        route: originalUrl,
        status_code: code,
      };
      const createLog = this._logsRepo.create(payload);
      this._logsRepo.save(createLog);

      if (code != 200) {
        throw new HttpException(msg, code);
      }

      this._slack.smServerLogToSlack(JSON.stringify(data), originalUrl);

      return {
        code: code,
        message: msg,
        data: data,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async generateError(error: any, req?: Request, isSlacked: boolean = true) {
    try {
      let orignal_url: any;

      if (req) {
        const { originalUrl } = req;
        orignal_url = originalUrl;
      } else {
        orignal_url = 'Cron Job Failed';
      }

      const payload = {
        message: error.message,
        isError: true,
        route: orignal_url,
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
      };
      const createLog = this._logsRepo.create(payload);
      await this._logsRepo.save(createLog);

      if (isSlacked) {
        this._slack.smErrorToSlack(error, orignal_url);
      }

      let msg = 'something went wrong !';
      let code = HttpStatus.INTERNAL_SERVER_ERROR;
      if (error.message == 'jwt expired' || error.message == 'jwt malformed') {
        msg = 'Auth token is expired! please re-login into system';
        code = HttpStatus.UNAUTHORIZED;
      }

      if (orignal_url != 'Cron Job Failed') {
        throw new HttpException(error.message, error.status);
      }
    } catch (error) {
      console.log(error);
      throw new HttpException(error.message, error.status);
    }
  }
}

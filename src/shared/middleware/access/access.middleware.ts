import { HttpStatus, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { GeneralService } from 'src/shared/services/general.service';
import { JwtService } from 'src/shared/services/jwt.service';
import { ResponseService } from 'src/shared/services/response.service';
import * as _ from 'lodash';

@Injectable()
export class AccessMiddleware implements NestMiddleware {
  constructor(
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('JWT-SERVICE') private jwt: JwtService,
    @Inject('GENERAL-SERVICE') private _general: GeneralService,
  ) {}

  async use(req: Request, res: Response, next: () => void) {
    try {
      if (req.headers) {
        const { authorization } = req.headers;

        if (!authorization) {
          return res.send(
            this.res.generateResponse(
              HttpStatus.NOT_ACCEPTABLE,
              'Authorization token is required!',
              null,
              req,
            ),
          );
        }

        const decodedToken: any = this.jwt.decodeAccessToken(authorization);

        if (!decodedToken) {
          return res.send(
            this.res.generateResponse(
              HttpStatus.BAD_REQUEST,
              'Authorization token is Invalid!',
              null,
              req,
            ),
          );
        }

        const isVerify = await this._general.verifyWLAcc(
          decodedToken,
          authorization,
        );

        if (!isVerify) {
          return res.send(
            this.res.generateResponse(
              HttpStatus.NOT_ACCEPTABLE,
              'Authorization token is Expired!',
              null,
              req,
            ),
          );
        }
        next();
      } else {
        return res.send(
          this.res.generateResponse(
            HttpStatus.BAD_GATEWAY,
            'Headers is missing',
            [],
            req,
          ),
        );
      }
    } catch (error) {
      return res.send(await this.res.generateError(error, req, false));
    }
  }
}

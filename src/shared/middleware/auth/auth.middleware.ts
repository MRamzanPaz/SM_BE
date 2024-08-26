/* eslint-disable prettier/prettier */
import {
  HttpStatus,
  Inject,
  Injectable,
  NestMiddleware,
  forwardRef,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GeneralService } from '../../services/general.service';
import { JwtService } from '../../services/jwt.service';
import { ResponseService } from '../../services/response.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
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

        const decodedToken = this.jwt.decode(authorization);

        const isVerify = await this._general.verifyUser(
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
      console.log(error);
      return res.send(await this.res.generateError(error, req, false));
    }
  }
}

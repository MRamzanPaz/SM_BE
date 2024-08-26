/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-empty-function */
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  createAuthToken(payload: any) {
    const authToken = jwt.sign(payload, process.env.JWT_SECRETE, {
      expiresIn: '1d',
    });
    return authToken;
  }

  decode(token: string) {
    const decode = jwt.verify(token, process.env.JWT_SECRETE);
    return decode;
  }

  createAccessToken(payload: any) {
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET);
    return accessToken;
  }

  decodeAccessToken(token: string) {
    try {
      // console.log(token)
      const decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      // console.log(decode)
      return decode;
    } catch (error) {
      return false;
    }
  }
}

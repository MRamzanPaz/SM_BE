import {
  Injectable,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import * as axios from 'axios';
import { Request } from 'express';
import { catchError, lastValueFrom, map, tap } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as uuid from 'uuid';
import * as crypto from 'crypto';
import * as cryptoJs from 'crypto-js';
import { WebClient } from '@slack/web-api';
import { SlackService } from './slack.service';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
@Injectable()
export class ApiService {
  AXIOS = axios.default;

  constructor(
    private _http: HttpService,
    @Inject('SLACK-SERVICE') private _slack: SlackService,
  ) {
    this._http.axiosRef.interceptors.request.use(
      (config: AxiosRequestConfig | any) => {
        const payload = {
          type: 'REQUEST',
          endpoint: config.url,
          method: config.method.toLocaleUpperCase(),
          response: JSON.stringify(config.data),
        };
        this._slack.smVendorsLogToSlack(payload, true);
        // You can add headers or other config modifications here
        return config;
      },
      (error) => {
        // Handle request error
        return Promise.reject(error);
      },
    );

    this._http.axiosRef.interceptors.response.use(
      (response: AxiosResponse) => {
        const payload = {
          type: 'RESPONSE-SUCESS',
          endpoint: response.config.url,
          method: response.config.method.toLocaleUpperCase(),
          response: JSON.stringify(response.data),
        };
        this._slack.smVendorsLogToSlack(payload, false);
        return response;
      },
      (error) => {
        const payload = {
          type: 'RESPONSE-ERROR',
          endpoint: error.config.url,
          method: error.config.method.toLocaleUpperCase(),
          response: JSON.stringify(error.response.data),
        };
        this._slack.smVendorsLogToSlack(payload, false);
        console.error(
          `Error response from ${error.config.url}:`,
          error.response.data,
        );
        return Promise.reject(error);
      },
    );
  }

  async postSlackMessage(data: any, route: string, isError: Boolean) {
    const options = {};
    const web = new WebClient(process.env.SLACK_TOKEN, options);

    const block: any = {
      text: isError ? `*System-Mandeep-Error*` : `*System-Mandeep-Sucess*`,
      attachments: [
        {
          text: `ENV: *${process.env.NODE_ENV.toUpperCase()}*`,
        },
        {
          text: `*Route*: ${route}`,
        },
        {
          text: `*${data}*`,
        },
      ],
    };

    return new Promise(async (resolve, reject) => {
      const channelId = process.env.SLACK_CHANNEL_ID;
      try {
        const resp = await web.chat.postMessage({
          ...block,
          channel: channelId,
        });
        return resolve(true);
      } catch (error) {
        return resolve(true);
      }
    });

    // const body = JSON.stringify({
    //     text: `*System-Mandeep-Nest-BE*`,
    //     attachments: [
    //         {
    //             text: `ENV: *${process.env.NODE_ENV.toUpperCase()}*`,
    //         },
    //         {
    //             text: `*Route*: ${route}`,
    //         },
    //         {
    //             text: `*${error}*`,
    //         },
    //     ],
    // });

    // return this.AXIOS.post(process.env.SLACK_WEB_HOOK, body).finally();
  }

  async getCountries(): Promise<any> {
    const headers = {
      'X-CSCAPI-KEY': process.env.OPEN_API_COUNTRIES_KEY,
    };

    const request = this._http
      .get(`${process.env.OPEN_API_COUNTRIES}/countries`, { headers: headers })
      .pipe(map((res) => res.data))
      .pipe(
        map((res) => {
          return res.map((ele) => {
            return {
              country_name: ele.name,
              country_code: ele.iso2,
            };
          });
        }),
      );

    return await lastValueFrom(request);
  }

  async getCountryDetails(countryCode: string) {
    const headers = {
      'X-CSCAPI-KEY': process.env.OPEN_API_COUNTRIES_KEY,
    };
    const request = this._http
      .get(`${process.env.OPEN_API_COUNTRIES}/countries/${countryCode}`, {
        headers: headers,
      })
      .pipe(map((res) => res.data));
    return await lastValueFrom(request);
  }

  async getStateByCountry(country_code: string): Promise<any> {
    try {
      const headers = {
        'X-CSCAPI-KEY': process.env.OPEN_API_COUNTRIES_KEY,
      };

      const request = this._http
        .get(
          `${process.env.OPEN_API_COUNTRIES}/countries/${country_code}/states`,
          { headers: headers },
        )
        .pipe(
          map((res) => res.data),
          catchError((e) => {
            return (e = []);
          }),
        );

      return await lastValueFrom(request);
    } catch (error) {
      return [];
    }
  }

  async getCityByStateAndCountry(country_code: string, state_code: string) {
    try {
      console.log(
        'REQUEST: ',
        `${process.env.OPEN_API_COUNTRIES}/countries/${country_code}/states/${state_code}/cities`,
      );
      const headers = {
        'X-CSCAPI-KEY': process.env.OPEN_API_COUNTRIES_KEY,
      };

      const request = this._http
        .get(
          `${process.env.OPEN_API_COUNTRIES}/countries/${country_code}/states/${state_code}/cities`,
          { headers: headers },
        )
        .pipe(
          map((res) => res.data),
          catchError((e) => []),
        );
      // console.log(await lastValueFrom(request));
      return await lastValueFrom(request);
    } catch (error) {
      return [];
    }
  }

  // AIRALO-START

  async airaloSubmitOrder(body: any) {
    const headers = {
      Accept: 'application/json',
      Authorization: process.env.AIRALO_AUTH_TOKEN,
    };
    const endpoint = `${process.env.AIRALO_ENDPOINT}/v1/orders`;
    const request = this._http.post(endpoint, body, { headers: headers }).pipe(
      map((res) => {
        return res?.data;
      }),
      catchError((e) => {
        throw new HttpException(e.response.data, e.response.status);
      }),
    );

    return await lastValueFrom(request);
  }

  async airaloGetDataUsage(iccid: string) {
    const headers = {
      Accept: 'application/json',
      Authorization: process.env.AIRALO_AUTH_TOKEN,
    };
    const endpoint = `${process.env.AIRALO_ENDPOINT}/v1/sims/${iccid}/usage`;
    try {
      const request = this._http
        .get(endpoint, {
          headers: headers,
        })
        .pipe(
          map((res) => {
            return res?.data;
          }),
          catchError((e) => {
            throw new HttpException(e.response.data, e.response.status);
          }),
        );

      return await lastValueFrom(request);
    } catch (error) {
      return {
        error: true,
      };
    }
  }

  async airaloApplyBundle(body: any) {
    const headers = {
      Accept: 'application/json',
      Authorization: process.env.AIRALO_AUTH_TOKEN,
    };

    const request = this._http
      .post(`${process.env.AIRALO_ENDPOINT}/v1/orders/topups`, body, {
        headers: headers,
      })
      .pipe(
        map((res) => res?.data),
        tap((res) => console.log(res)),
      );

    return await lastValueFrom(request);
  }

  getAirAloBundleDetails(iccid: string) {
    const headers = {
      Accept: 'application/json',
      Authorization: process.env.AIRALO_AUTH_TOKEN,
    };

    const request = this._http
      .get(`${process.env.AIRALO_ENDPOINT}/v1/sims/${iccid}/usage`, { headers })
      .pipe(
        map((res) => res?.data),
        tap((res) => console.log(res)),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return lastValueFrom(request);
  }

  getAirAloTopupPackages(iccid: string) {
    const headers = {
      Accept: 'application/json',
      Authorization: process.env.AIRALO_AUTH_TOKEN,
    };

    const request = this._http
      .get(`${process.env.AIRALO_ENDPOINT}/v1/sims/${iccid}/topups`, {
        headers,
      })
      .pipe(
        map((res) => res?.data),
        tap((res) => console.log(res)),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return lastValueFrom(request);
  }

  getAirAloPastOrders(page: number, limit: number, include: string) {
    const headers = {
      Accept: 'application/json',
      Authorization: process.env.AIRALO_AUTH_TOKEN,
    };

    const request = this._http
      .get(
        `${process.env.AIRALO_ENDPOINT}/v1/orders?include=${include}&page=${page}&limit=${limit}`,
        { headers },
      )
      .pipe(
        map((res) => res?.data),
        // tap((res) => console.log(res)),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return lastValueFrom(request);
  }

  getAirAloPackagesV2(page: number, limit: number, type: string) {
    const headers = {
      Accept: 'application/json',
      Authorization: process.env.AIRALO_AUTH_TOKEN,
    };

    const request = this._http
      .get(
        `${process.env.AIRALO_ENDPOINT}/v2/packages?filter[type]=${type}&page=${page}&limit=${limit}`,
        { headers },
      )
      .pipe(
        map((res) => res?.data),
        // tap((res) => console.log(res)),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return lastValueFrom(request);
  }

  getAiraloDeviceList() {
    const headers = {
      Accept: 'application/json',
      Authorization: process.env.AIRALO_AUTH_TOKEN,
    };

    const request = this._http
      .get(`${process.env.AIRALO_ENDPOINT}/v1/compatible-devices`, { headers })
      .pipe(
        map((res) => res?.data),
        // tap((res) => console.log(res)),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return lastValueFrom(request);
  }

  // AIRALO-END

  // ESIM-GO-START

  async eSimGoProcessOrder(body: any) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const request = this._http
      .post(`${process.env.ESIM_GO_ENDPOINT}/orders`, body, {
        headers: headers,
      })
      .pipe(
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );
    return await lastValueFrom(request);
  }

  async eSimGoGetData(reference: string) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
      Accept: '*/*',
    };

    const request = this._http
      .get(`${process.env.ESIM_GO_ENDPOINT}/esims/assignments/` + reference, {
        headers: headers,
      })
      .pipe(map((res) => res?.data));

    return await lastValueFrom(request);
  }

  async eSimGoSendNotification(iccid: string, body: any) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const request = this._http
      .post(`${process.env.ESIM_GO_ENDPOINT}/esims/${iccid}/sms`, body, {
        headers: headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
      );

    return await lastValueFrom(request);
  }

  async eSimGoApplyBundle(body: any) {
    console.log(body);
    try {
      const headers = {
        'X-API-Key': process.env.ESIM_GO_API_KEY,
      };

      const request = this._http
        .post(`${process.env.ESIM_GO_ENDPOINT}/esims/apply`, body, {
          headers: headers,
        })
        .pipe(
          map((res) => res?.data),
          tap((res) => console.log(res)),
        );

      return await lastValueFrom(request);
    } catch (error) {
      const data = {
        status: error.response.status,
        data: error.response.data,
      };
      return data;
    }
  }

  async validateEsim(iccid: string) {
    try {
      const headers = {
        'X-API-Key': process.env.ESIM_GO_API_KEY,
      };

      const response = await this._http
        .get(`${process.env.ESIM_GO_ENDPOINT}/esims/${iccid}`, { headers })
        .pipe(map((res) => res?.data));

      const data = await lastValueFrom(response);
      return {
        status: 200,
        data: data,
      };
    } catch (error) {
      return {
        status: 400,
        data: null,
      };
    }
  }

  async getBundleDetail(iccid: string) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const response = await this._http
      .get(`${process.env.ESIM_GO_ENDPOINT}/esims/${iccid}/bundles`, {
        headers,
      })
      .pipe(
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(response);
  }

  async geteSimDetailsAndStatus(iccid: string) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const response = await this._http
      .get(`${process.env.ESIM_GO_ENDPOINT}/esims/${iccid}`, { headers })
      .pipe(
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(response);
  }

  async refundEsimGoBundle(iccid: string, bundle: string, type: string) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const response = this._http
      .delete(
        `${process.env.ESIM_GO_ENDPOINT}/esims/${iccid}/bundles/${bundle}?refundToBalance=true&type=${type}`,
        { headers },
      )
      .pipe(
        tap((res) => console.log('refund bundle', res)),
        map((res) => res?.data),

        catchError((e) => {
          throw new HttpException(
            'This order cannot be refunded, you may reject this refund request!',
            HttpStatus.BAD_GATEWAY,
          );
        }),
      );

    return await lastValueFrom(response);
  }

  async getEsimGoPastOrders(includeIccids: Boolean, page: number) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const response = this._http
      .get(
        `${process.env.ESIM_GO_ENDPOINT}/orders?includeIccids=true&page=${page}`,
        { headers },
      )
      .pipe(
        // tap(res => console.log("refund bundle",res)),
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(response);
  }

  async getEsimGoSpecificOrders(orderReference: string) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const response = this._http
      .get(`${process.env.ESIM_GO_ENDPOINT}/orders/${orderReference}`, {
        headers,
      })
      .pipe(
        // tap(res => console.log("refund bundle",res)),
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(response);
  }

  async getEsimGoInventory() {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const response = this._http
      .get(`${process.env.ESIM_GO_ENDPOINT}/inventory`, { headers })
      .pipe(
        // tap(res => console.log("refund bundle",res)),
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(response);
  }

  async esimGOrefundInventory(payload) {
    const headers = {
      'X-API-Key': process.env.ESIM_GO_API_KEY,
    };

    const response = this._http
      .post(`${process.env.ESIM_GO_ENDPOINT}/inventory/refund`, payload, {
        headers,
      })
      .pipe(
        // tap(res => console.log("refund bundle",res)),
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(response);
  }

  // ESIM-GO-END

  // KEEP-GO-START

  async keepGoLineCreate(body: any) {
    const headers = {
      apiKey: process.env.KEEP_GO_API_KEY,
      accessToken: process.env.KEEP_GO_ACCESS_TOKEN,
    };

    const request = this._http
      .post(`${process.env.KEEP_GO_ENDPOINT}/line/create`, body, {
        headers: headers,
      })
      .pipe(map((res) => res?.data));
    return await lastValueFrom(request);
  }

  async getKeepGoBundle(bundle_id) {
    const headers = {
      apiKey: process.env.KEEP_GO_API_KEY,
      accessToken: process.env.KEEP_GO_ACCESS_TOKEN,
    };

    const request = this._http
      .get(`${process.env.KEEP_GO_ENDPOINT}/bundles/${bundle_id}`, {
        headers: headers,
      })
      .pipe(map((res) => res?.data));
    return await lastValueFrom(request);
  }

  async getKeepGoBundleDetails(iccid: any) {
    const headers = {
      apiKey: process.env.KEEP_GO_API_KEY,
      accessToken: process.env.KEEP_GO_ACCESS_TOKEN,
    };

    const request = this._http
      .get(`${process.env.KEEP_GO_ENDPOINT}/line/${iccid}/get_details`, {
        headers,
      })
      .pipe(
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  // KEEP-GO-END

  // RED-TEA-START

  async redTeaOrderProfile(body: any) {
    const RT_RequestID = uuid.v4();
    const RT_Timestamp = new Date().getMilliseconds();
    const access_code = process.env.RED_TEA_ACCESS_CODE;
    const secrete_key = process.env.REA_TEA_SECRETE_KEY;

    const signStr =
      RT_Timestamp + RT_RequestID + access_code + JSON.stringify(body);

    const RT_Signature = cryptoJs.HmacSHA256(signStr, secrete_key).toString();

    const headers = {
      'RT-AccessCode': access_code,
      'RT-RequestID': RT_RequestID,
      'RT-Signature': RT_Signature,
      'RT-Timestamp': `${RT_Timestamp}`,
      SecretKey: secrete_key,
    };
    console.log(headers);
    const request = this._http
      .post(`${process.env.RED_TEA_ENDPOINT}/open/esim/order`, body, {
        headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async getAllocateProfile(body: any) {
    console.log('body', body);

    const RT_RequestID = uuid.v4();
    const RT_Timestamp = new Date().getMilliseconds();
    const access_code = process.env.RED_TEA_ACCESS_CODE;
    const secrete_key = process.env.REA_TEA_SECRETE_KEY;

    const signStr =
      RT_Timestamp + RT_RequestID + access_code + JSON.stringify(body);

    const RT_Signature = cryptoJs.HmacSHA256(signStr, secrete_key).toString();

    const headers = {
      'RT-AccessCode': access_code,
      'RT-RequestID': RT_RequestID,
      'RT-Signature': RT_Signature,
      'RT-Timestamp': `${RT_Timestamp}`,
      SecretKey: secrete_key,
    };

    console.log(headers);

    const request = this._http
      .post(`${process.env.RED_TEA_ENDPOINT}/open/esim/query`, body, {
        headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async RedteaBundleApply(body: any) {
    console.log('body', body);

    const RT_RequestID = uuid.v4();
    const RT_Timestamp = new Date().getMilliseconds();
    const access_code = process.env.RED_TEA_ACCESS_CODE;
    const secrete_key = process.env.REA_TEA_SECRETE_KEY;

    const signStr =
      RT_Timestamp + RT_RequestID + access_code + JSON.stringify(body);

    const RT_Signature = cryptoJs.HmacSHA256(signStr, secrete_key).toString();

    const headers = {
      'RT-AccessCode': access_code,
      'RT-RequestID': RT_RequestID,
      'RT-Signature': RT_Signature,
      'RT-Timestamp': `${RT_Timestamp}`,
      SecretKey: secrete_key,
    };

    console.log(headers);

    const request = this._http
      .post(`${process.env.RED_TEA_ENDPOINT}/open/esim/topup`, body, {
        headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async RedteaIccidDetails(body: any) {
    const RT_RequestID = uuid.v4();
    const RT_Timestamp = new Date().getMilliseconds();
    const access_code = process.env.RED_TEA_ACCESS_CODE;
    const secrete_key = process.env.REA_TEA_SECRETE_KEY;

    const signStr =
      RT_Timestamp + RT_RequestID + access_code + JSON.stringify(body);

    const RT_Signature = cryptoJs.HmacSHA256(signStr, secrete_key).toString();

    const headers = {
      'RT-AccessCode': access_code,
      'RT-RequestID': RT_RequestID,
      'RT-Signature': RT_Signature,
      'RT-Timestamp': `${RT_Timestamp}`,
      SecretKey: secrete_key,
    };

    console.log(headers);

    const request = this._http
      .post(`${process.env.RED_TEA_ENDPOINT}/open/esim/query`, body, {
        headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async getRedTeaPastOrders(body: any) {
    const RT_RequestID = uuid.v4();
    const RT_Timestamp = new Date().getMilliseconds();
    const access_code = process.env.RED_TEA_ACCESS_CODE;
    const secrete_key = process.env.REA_TEA_SECRETE_KEY;

    const signStr =
      RT_Timestamp + RT_RequestID + access_code + JSON.stringify(body);

    const RT_Signature = cryptoJs.HmacSHA256(signStr, secrete_key).toString();

    const headers = {
      'RT-AccessCode': access_code,
      'RT-RequestID': RT_RequestID,
      'RT-Signature': RT_Signature,
      'RT-Timestamp': `${RT_Timestamp}`,
      SecretKey: secrete_key,
    };

    console.log(headers);

    const request = this._http
      .post(`${process.env.RED_TEA_ENDPOINT}/open/esim/query`, body, {
        headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async getRedTeaPackage(body: any) {
    const RT_RequestID = uuid.v4();
    const RT_Timestamp = new Date().getMilliseconds();
    const access_code = process.env.RED_TEA_ACCESS_CODE;
    const secrete_key = process.env.REA_TEA_SECRETE_KEY;

    const signStr =
      RT_Timestamp + RT_RequestID + access_code + JSON.stringify(body);

    const RT_Signature = cryptoJs.HmacSHA256(signStr, secrete_key).toString();

    const headers = {
      'RT-AccessCode': access_code,
      'RT-RequestID': RT_RequestID,
      'RT-Signature': RT_Signature,
      'RT-Timestamp': `${RT_Timestamp}`,
      SecretKey: secrete_key,
    };

    // console.log(headers)

    const request = this._http
      .post(`${process.env.RED_TEA_ENDPOINT}/open/package/list`, body, {
        headers,
      })
      .pipe(
        // tap(res => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async redTeaRevokeProfile(body: any) {
    const RT_RequestID = uuid.v4();
    const RT_Timestamp = new Date().getMilliseconds();
    const access_code = process.env.RED_TEA_ACCESS_CODE;
    const secrete_key = process.env.REA_TEA_SECRETE_KEY;

    const signStr =
      RT_Timestamp + RT_RequestID + access_code + JSON.stringify(body);

    const RT_Signature = cryptoJs.HmacSHA256(signStr, secrete_key).toString();

    const headers = {
      'RT-AccessCode': access_code,
      'RT-RequestID': RT_RequestID,
      'RT-Signature': RT_Signature,
      'RT-Timestamp': `${RT_Timestamp}`,
      SecretKey: secrete_key,
    };

    // console.log(headers)

    const request = this._http
      .post(`${process.env.RED_TEA_ENDPOINT}/open/esim/revoke`, body, {
        headers,
      })
      .pipe(
        // tap(res => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  // RED-TEA-END

  // MOBI-MATTER-START

  async mobiMatterCreateOrder(body: any) {
    const headers = {
      Accept: 'text/plain',
      MerchantId: process.env.MOBI_MATTER_MERCHANT_ID,
      'api-key': process.env.MOBI_MATTER_API_KEY,
    };

    const request = this._http
      .post(`${process.env.MOBI_MATTER_ENDPOINT}/order`, body, { headers })
      .pipe(
        // tap(res => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async mobiMatterOrderInfo(order_id: string) {
    const headers = {
      Accept: 'text/plain',
      MerchantId: process.env.MOBI_MATTER_MERCHANT_ID,
      'api-key': process.env.MOBI_MATTER_API_KEY,
    };

    const request = this._http
      .get(`${process.env.MOBI_MATTER_ENDPOINT}/order/${order_id}`, { headers })
      .pipe(
        // tap(res => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async mobiMatterCompleteOrder(body: any) {
    const headers = {
      Accept: 'text/plain',
      MerchantId: process.env.MOBI_MATTER_MERCHANT_ID,
      'api-key': process.env.MOBI_MATTER_API_KEY,
    };

    const request = this._http
      .put(`${process.env.MOBI_MATTER_ENDPOINT}/order/complete`, body, {
        headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async mobiMatterOrderDetailsByIccid(iccid: string) {
    const headers = {
      Accept: 'text/plain',
      MerchantId: process.env.MOBI_MATTER_MERCHANT_ID,
      'api-key': process.env.MOBI_MATTER_API_KEY,
    };

    const request = this._http
      .get(`${process.env.MOBI_MATTER_ENDPOINT}/order?iccid=${iccid}`, {
        headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async mobiMatterIccidUsage(order_id: string) {
    const headers = {
      Accept: 'text/plain',
      MerchantId: process.env.MOBI_MATTER_MERCHANT_ID,
      'api-key': process.env.MOBI_MATTER_API_KEY,
    };

    const request = this._http
      .get(`${process.env.MOBI_MATTER_ENDPOINT}/provider/info/${order_id}`, {
        headers,
      })
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  // MOBI-MATTER-END

  // FLEXIROAM-START

  async flexiroamGetSims(body: any) {
    const headers = {
      token: process.env.FLEXIROAM_TOKEN,
    };

    const request = this._http
      .post(
        `${process.env.FLEXIROAM_ENDPOINT}/product/inventory/view/v1`,
        body,
        { headers },
      )
      .pipe(
        tap((res) => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  async flexiroamPurchasePlan(body: any) {
    const headers = {
      token: process.env.FLEXIROAM_TOKEN,
    };

    const request = this._http
      .post(`${process.env.FLEXIROAM_ENDPOINT}/user/order/sim/plan/v1`, body, {
        headers,
      })
      .pipe(
        // tap(res => console.log(res)),
        map((res) => res?.data),
        catchError((e) => {
          console.log(e.response.data);
          throw new HttpException(e.response.data, e.response.status);
        }),
      );

    return await lastValueFrom(request);
  }

  // FLEXIROAM-END
}

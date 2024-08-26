import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShopifyWebHooks } from 'src/entities/shopifyWebHook.entity';
import { IsNull, Repository } from 'typeorm';
import { GenerateUrlDto } from './shopify.dto';
import { Request } from 'express';
import { ResponseService } from 'src/shared/services/response.service';
import { Wl_Account } from 'src/entities/wl_account.entity';
import * as generator from 'otp-generator';
import { JwtService } from 'src/shared/services/jwt.service';
import { Orders } from 'src/entities/order.entity';

@Injectable()
export class ShopifyService {
  constructor(
    @InjectRepository(ShopifyWebHooks)
    private readonly _ShopifyWebhookRepo: Repository<ShopifyWebHooks>,
    @InjectRepository(Wl_Account)
    private readonly _whitelabelRepo: Repository<Wl_Account>,
    @InjectRepository(Orders) private readonly _orderRepo: Repository<Orders>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('JWT-SERVICE') private jwt: JwtService,
  ) {}

  async generateShopifyUrl(body: GenerateUrlDto, req: Request) {
    try {
      const { wl_id } = body;

      const wl_account = await this._whitelabelRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: wl_id,
        },
      });

      if (!wl_account) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid Whitelabel provided!',
          [],
          req,
        );
      }

      const isExsist = await this._ShopifyWebhookRepo.findOne({
        where: {
          deleted_at: IsNull(),
          whitelabel: {
            id: wl_id,
          },
        },
      });

      if (isExsist) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Web-Hook already Created for this whitelabel!',
          [],
          req,
        );
      }

      const access_id: string = generator.generate(8, {
        digits: true,
        lowerCaseAlphabets: true,
        upperCaseAlphabets: true,
        specialChars: false,
      });

      const generateUrl = this._ShopifyWebhookRepo.create({
        access_id: access_id,
        base_url: process.env.SERVER_IP,
        webhook_url: `/web-hook/shopify/${access_id}`,
        whitelabel: wl_account,
      });

      await this._ShopifyWebhookRepo.save(generateUrl);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Webhook generated',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllWebhooks(req: Request) {
    try {
      const webhooks = await this._ShopifyWebhookRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          whitelabel: true,
        },
        select: {
          whitelabel: {
            username: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Web-hook list',
        webhooks,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getOrderByShopifyId(order_id: string, req: Request) {
    try {
      const wl_acount: any = this.jwt.decodeAccessToken(
        req.headers.authorization,
      );

      const findOrder = await this._orderRepo.findOne({
        where: {
          deleted_at: IsNull(),
          shopify_orderNo: order_id,
          wl_id: {
            id: wl_acount.id,
          },
        },
        relations: {
          order_details: true,
          plan_id: true,
        },
        select: {
          plan_id: {
            plan_name: true,
            data: true,
            id: true,
            validity: true,
          },
        },
      });

      return findOrder;
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

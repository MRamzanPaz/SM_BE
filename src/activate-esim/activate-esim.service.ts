import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivatedESims } from 'src/entities/activatedEsims.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { ApiService } from 'src/shared/services/api.service';
import { ResponseService } from 'src/shared/services/response.service';
import { IsNull, Like, Repository } from 'typeorm';
import {
  AvtivateEsimDto,
  PaginationDto,
  UpdateActivatedEsimDto,
} from './activate-esim.dto';
import { Request } from 'express';

@Injectable()
export class ActivateEsimService {
  constructor(
    @InjectRepository(ActivatedESims)
    private readonly _activateEsimRepo: Repository<ActivatedESims>,
    @InjectRepository(Wl_Account)
    private readonly _wlAccountRepo: Repository<Wl_Account>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
  ) {}

  async activateEsim(body: AvtivateEsimDto, req: Request) {
    try {
      const { wl_id, iccid } = body;

      if (process.env.NODE_ENV != 'dev') {
        const { data, status } = await this._api.validateEsim(iccid);

        if (status != 200) {
          return this.res.generateResponse(
            HttpStatus.BAD_REQUEST,
            'Invalid Iccid provided !',
            data,
            req,
          );
        }
      }

      const isAlreadyAssign = await this._activateEsimRepo.findOne({
        where: {
          deleted_at: IsNull(),
          iccid: iccid,
        },
      });

      if (isAlreadyAssign) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'This Iccid is already assigned !',
          [],
          req,
        );
      }

      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: wl_id,
        },
      });

      if (!whitelabel) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid whitelabel provided !',
          [],
          req,
        );
      }

      const ativation = this._activateEsimRepo.create({
        wl_account: whitelabel,
        iccid: iccid,
        singleUse: false,
      });

      await this._activateEsimRepo.save(ativation);

      const data = {
        iccid: iccid,
        status: 'activated',
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Iccid activated!',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updateActivatedEsim(body: UpdateActivatedEsimDto, req: Request) {
    try {
      const { id, wl_id, iccid } = body;

      if (process.env.NODE_ENV != 'dev') {
        const { data, status } = await this._api.validateEsim(iccid);

        if (status != 200) {
          return this.res.generateResponse(
            HttpStatus.BAD_REQUEST,
            'Invalid Iccid provided !',
            data,
            req,
          );
        }
      }

      const whitelabel = await this._wlAccountRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: wl_id,
        },
      });

      if (!whitelabel) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid whitelabel provided !',
          [],
          req,
        );
      }

      await this._activateEsimRepo
        .createQueryBuilder()
        .update()
        .set({
          iccid: iccid,
          wl_account: whitelabel,
          singleUse: false,
        })
        .where('id = :id', { id: id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Iccid activated!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deletedActivatedEsim(id: string, req: Request) {
    try {
      const findOne = await this._activateEsimRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: parseInt(id),
        },
      });

      if (!findOne) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid ID provided !',
          [],
          req,
        );
      }

      await this._activateEsimRepo
        .createQueryBuilder()
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('id = :id', { id: id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Iccid deleted!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllActivatedEsimList(req: Request) {
    try {
      const findAll = await this._activateEsimRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          wl_account: true,
        },
        select: {
          wl_account: {
            id: true,
            username: true,
            email: true,
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Acticated Esim List!',
        findAll,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllActivatedEsimByPagination(query: PaginationDto, req: Request) {
    try {
      const { page, pageSize, searchStr } = query;

      const findAll = await this._activateEsimRepo.find({
        where: {
          deleted_at: IsNull(),
          iccid: Like(`%${searchStr}%`),
        },
        relations: {
          wl_account: true,
        },
        select: {
          wl_account: {
            username: true,
            id: true,
          },
        },
        order: {
          id: 'DESC',
        },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      });

      const totalActivatedEsims = await this._activateEsimRepo.count({
        where: {
          deleted_at: IsNull(),
          iccid: Like(`%${searchStr}%`),
        },
      });

      const data = {
        page,
        pageSize,
        total: totalActivatedEsims,
        list: findAll,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Acticated Esim List!',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

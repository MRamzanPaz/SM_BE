import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AddDeviceDto, PaginationDto, UpdateDeviceDto } from './device.dto';
import { Request } from 'express';
import { ResponseService } from 'src/shared/services/response.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Devices } from 'src/entities/devices.entity';
import { IsNull, Repository } from 'typeorm';
import { ApiService } from 'src/shared/services/api.service';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Devices)
    private readonly _deviceRepo: Repository<Devices>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
  ) {}

  async addDevives(body: AddDeviceDto, req: Request) {
    try {
      const { model, brand, os, name } = body;

      const device = await this._deviceRepo.findOne({
        where: {
          model: model,
          brand: brand,
          name: name,
        },
      });

      if (device) {
        throw new HttpException(
          'This device already in our system',
          HttpStatus.BAD_REQUEST,
        );
      }

      const createNewdevice = this._deviceRepo.create({
        ...body,
      });

      await this._deviceRepo.save(createNewdevice);

      return this.res.generateResponse(
        HttpStatus.OK,
        'New device added',
        createNewdevice,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updateDevice(body: UpdateDeviceDto, req: Request) {
    try {
      const { model, brand, os, name, id } = body;

      const device = await this._deviceRepo.findOne({
        where: {
          id: id,
        },
      });

      if (!device) {
        throw new HttpException('Device Not Found', HttpStatus.BAD_REQUEST);
      }

      await this._deviceRepo
        .createQueryBuilder()
        .update()
        .set({
          model: model,
          brand: brand,
          os: os,
          name: name,
        })
        .where('id = :id', { id: id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Device Updated',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllDevices(req: Request) {
    try {
      const deviceList = await this._deviceRepo.find({
        where: {
          deleted_at: IsNull(),
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Device List',
        deviceList,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllDeviceWithPagination(query: PaginationDto, req: Request) {
    try {
      const { page, pageSize } = query;

      const deviceList = await this._deviceRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      });

      const totalDevices = await this._deviceRepo.count({
        where: {
          deleted_at: IsNull(),
        },
      });

      const response = {
        page,
        pageSize,
        total: totalDevices,
        list: deviceList,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Device List',
        response,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async setupAirAloDevices(req: Request) {
    try {
      const { data } = await this._api.getAiraloDeviceList();

      for (const device of data) {
        const findDevice = await this._deviceRepo.findOne({
          where: {
            model: device.model,
            os: device.os,
            brand: device.brand,
            name: device.name,
            deleted_at: IsNull(),
          },
        });

        if (!findDevice) {
          const createNewDevice = this._deviceRepo.create({
            ...device,
          });

          await this._deviceRepo.save(createNewDevice);
        }
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Devices added sucessfully',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deleteDevice(id: string, req: Request) {
    try {
      const device = await this._deviceRepo.findOne({
        where: {
          id: parseInt(id),
          deleted_at: IsNull(),
        },
      });

      if (!device) {
        throw new HttpException('Device not found!', HttpStatus.BAD_REQUEST);
      }

      await this._deviceRepo
        .createQueryBuilder()
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('id = :id', { id: id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Device Deleted',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getDeviceByIdForWL(id: string, req: Request) {
    try {
      const device = await this._deviceRepo.findOne({
        where: {
          deleted_at: IsNull(),
          id: parseInt(id),
        },
      });

      if (!device) {
        throw new HttpException('Device not found!', HttpStatus.BAD_REQUEST);
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Device Deleted',
        device,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getDeviceByOSForWL(os: string, req: Request) {
    try {
      const device = await this._deviceRepo.find({
        where: {
          deleted_at: IsNull(),
          os: os,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Device Deleted',
        device,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getDeviceListForWL(req: Request) {
    try {
      const androidDevices = await this._deviceRepo.find({
        where: {
          deleted_at: IsNull(),
          os: 'android',
        },
      });

      const iosDevices = await this._deviceRepo.find({
        where: {
          deleted_at: IsNull(),
          os: 'ios',
        },
      });

      const data = {
        android: androidDevices,
        ios: iosDevices,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Devices List',
        data,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

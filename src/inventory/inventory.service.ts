import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Body,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inventory } from 'src/entities/inventory.entity';
import { Vendors } from 'src/entities/vendors.entity';
import { ResponseService } from 'src/shared/services/response.service';
import { IsNull, Repository } from 'typeorm';
import {
  AddChoicePlanDto,
  AddInventoryDto,
  PaginationDto,
  UpdateChoicePlanDto,
  UpdatePackageDto,
} from './inventory.dto';
import { Request } from 'express';
import { ChoicePlans } from 'src/entities/choicePlans.entity';
import * as generator from 'otp-generator';
import * as qrcode from 'qrcode';
import { eSimPlans } from 'src/entities/esim_plan.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly _inventoryRepo: Repository<Inventory>,
    @InjectRepository(ChoicePlans)
    private readonly _ChoicePlansRepo: Repository<ChoicePlans>,
    @InjectRepository(Vendors)
    private readonly _vendorRepo: Repository<Vendors>,
    @InjectRepository(eSimPlans)
    private readonly _plansRepo: Repository<eSimPlans>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
  ) {}

  // SM-INVENTORy-START

  async addInventoryList(body: AddInventoryDto, req: Request) {
    try {
      const {
        vendor_id,
        iccid,
        package_name,
        qr_code,
        apn,
        data_roaming,
        cost_price,
      } = body;

      const findVendor = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .where('id = :vendor_id AND deleted_at IS NULL', { vendor_id })
        .getOne();

      if (!findVendor) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Vendor is invalid or may be deleted!',
          null,
          req,
        );
      }

      const alreadyInInventory = await this._inventoryRepo.findOne({
        where: {
          iccid: iccid,
          deleted_at: IsNull(),
        },
      });

      if (alreadyInInventory) {
        throw new HttpException(
          'This e-sim alreading in inventory',
          HttpStatus.BAD_REQUEST,
        );
      }

      const IMAGE_NAME = `${iccid}.png`;
      await qrcode
        .toFile(`qr-codes/${IMAGE_NAME}`, qr_code, {
          errorCorrectionLevel: 'H',
          type: 'png',
        })
        .finally();

      const newInventory = this._inventoryRepo.create({
        iccid: iccid,
        package_name: package_name,
        qr_code: qr_code,
        qrcode_url: `${process.env.SERVER_IP}/images/${IMAGE_NAME}`,
        cost_price: cost_price,
        apn: apn,
        data_roaming: data_roaming,
        vendor: findVendor,
      });
      await this._inventoryRepo.save(newInventory);

      return this.res.generateResponse(
        HttpStatus.OK,
        'E-Sim added into inventory',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllPackages(req: Request) {
    try {
      const allPackages: Inventory[] = await this._inventoryRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          vendor: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Esim List List',
        allPackages,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllPackagesWithPagination(params: PaginationDto, req: Request) {
    try {
      const { searchStr, pagesize, page } = params;

      const packages = await this._inventoryRepo
        .createQueryBuilder('Inventory')
        .setFindOptions({
          skip: (parseInt(page) - 1) * parseInt(pagesize),
          take: parseInt(pagesize),
        })
        .where('deleted_at IS NULL AND plan_name LIKE :searchStr', {
          searchStr: `%${searchStr}%`,
        })
        .getMany();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Package List',
        packages,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updatePackage(body: UpdatePackageDto, req: Request) {
    try {
      const {
        id,
        vendor_id,
        iccid,
        package_name,
        qr_code,
        apn,
        data_roaming,
        cost_price,
        msisdn,
        rate_center,
        state,
        voicemail_system,
      } = body;

      const esim = await this._inventoryRepo.findOne({
        where: {
          id: id,
          deleted_at: IsNull(),
        },
      });

      if (!esim) {
        throw new HttpException(
          'Invalid iccid provided!',
          HttpStatus.BAD_REQUEST,
        );
      }
      const vendor = await this._vendorRepo.findOne({
        where: {
          id: vendor_id,
          deleted_at: IsNull(),
        },
      });

      if (!vendor) {
        throw new HttpException(
          'Invalid vendor provided!',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (iccid != esim.iccid || qr_code != esim.qr_code) {
        const IMAGE_NAME = `${iccid}.png`;
        await qrcode
          .toFile(`qr-codes/${IMAGE_NAME}`, qr_code, {
            errorCorrectionLevel: 'H',
            type: 'png',
          })
          .finally();
      }

      await this._inventoryRepo
        .createQueryBuilder()
        .update()
        .set({
          iccid: iccid,
          package_name: package_name,
          qr_code: qr_code,
          data_roaming: data_roaming,
          apn: apn,
          cost_price: cost_price,
          vendor: vendor,
          msisdn: msisdn,
        })
        .where('id = :id', { id: id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Esim update sucessfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deleteInventory(id: string, req: Request) {
    try {
      const esim = await this._inventoryRepo.findOne({
        where: {
          id: parseInt(id),
          deleted_at: IsNull(),
        },
      });

      if (!esim) {
        throw new HttpException('Invalid Id provided!', HttpStatus.BAD_REQUEST);
      }

      await this._inventoryRepo
        .createQueryBuilder()
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('id = :id', { id: id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Esim deleted sucessfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllPackagesByVendor(id: string, req: Request) {
    try {
      const pakacgesByVendor = await this._inventoryRepo.find({
        where: {
          deleted_at: IsNull(),
          vendor: {
            id: parseInt(id),
          },
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Packages List',
        pakacgesByVendor,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  // SM-INVENTORy-END

  // CHOICE-VENDOR-INVENTORU-START

  async addChoiceVendorPlan(body: AddChoicePlanDto, req: Request) {
    try {
      const {
        name,
        dft_buff_alloc_size,
        rate_group_allow_days,
        rate_group_occurrences,
        serving_networks,
        imsi_apns,
        rate_groups,
        vendor_id,
      } = body;

      const vendor = await this._vendorRepo.findOne({
        where: {
          id: vendor_id,
          deleted_at: IsNull(),
        },
      });

      if (!vendor) {
        throw new HttpException('Invalid Vendor ID', HttpStatus.BAD_REQUEST);
      }

      const code = generator.generate(10, {
        digits: true,
        lowerCaseAlphabets: true,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      const package_code = `chp-${code}`;

      const newChoicePlan = this._ChoicePlansRepo.create({
        name: name,
        package_code: package_code,
        dft_buff_alloc_size: dft_buff_alloc_size,
        rate_group_allow_days: rate_group_allow_days,
        rate_group_occurrences: rate_group_occurrences,
        serving_networks: JSON.stringify(serving_networks),
        imsi_apns: JSON.stringify(imsi_apns),
        rate_groups: JSON.stringify(rate_groups),
        vendor: vendor,
      });

      await this._ChoicePlansRepo.save(newChoicePlan);

      return this.res.generateResponse(
        HttpStatus.OK,
        'New Choice plan Added',
        {},
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updateChoiceVendorPlan(body: UpdateChoicePlanDto, req: Request) {
    try {
      const {
        id,
        name,
        dft_buff_alloc_size,
        rate_group_allow_days,
        rate_group_occurrences,
        serving_networks,
        imsi_apns,
        rate_groups,
        vendor_id,
      } = body;

      const choicePlan = await this._ChoicePlansRepo.findOne({
        where: {
          id: id,
          deleted_at: IsNull(),
        },
      });

      if (!choicePlan) {
        throw new HttpException('Invalid plan id', HttpStatus.BAD_REQUEST);
      }

      await this._ChoicePlansRepo
        .createQueryBuilder()
        .update()
        .set({
          name: name,
          dft_buff_alloc_size: dft_buff_alloc_size,
          rate_group_allow_days: rate_group_allow_days,
          rate_group_occurrences: rate_group_occurrences,
          serving_networks: JSON.stringify(serving_networks),
          imsi_apns: JSON.stringify(imsi_apns),
          rate_groups: JSON.stringify(rate_groups),
        })
        .where('id = :id', { id: id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Choice plan Updated',
        {},
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deleteChoicePlanId(id: string, req: Request) {
    try {
      const choicePlan = await this._ChoicePlansRepo.findOne({
        where: {
          id: parseInt(id),
          deleted_at: IsNull(),
        },
      });

      if (!choicePlan) {
        throw new HttpException('Invalid plan id', HttpStatus.BAD_REQUEST);
      }

      await this._ChoicePlansRepo
        .createQueryBuilder()
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('id = :id', { id: parseInt(id) })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Choice plan deleted',
        {},
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllChoicePlanList(req: Request) {
    try {
      const choicePlanList = await this._ChoicePlansRepo
        .query(
          `SELECT 
            *, 
            JSON_EXTRACT(serving_networks, '$') AS serving_networks, 
            JSON_EXTRACT(imsi_apns, '$')  AS imsi_apns, 
            JSON_EXTRACT(rate_groups, '$')  AS rate_groups 
            FROM choice_plans \n
            where deleted_at IS NULL
            `,
        )
        .finally();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Choice plan list',
        choicePlanList,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  // CHOICE-VENDOR-INVENTORU-END
}

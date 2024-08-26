import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vendors } from 'src/entities/vendors.entity';
import { Repository } from 'typeorm';
import {
  CreateVendorDto,
  DeleteVendorDto,
  PaginationDto,
  UpdateVendorDto,
} from './vendor.dto';
import e, { Request } from 'express';
import { ResponseService } from '../shared/services/response.service';

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendors)
    private readonly _vendorRepo: Repository<Vendors>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
  ) {}

  // *** IMPORTANT NOTE ***
  // invenotry have three types:
  // 1 for eSim
  // 2 for physical Sim
  // 3 for eSim and physical both

  async createVendor(body: CreateVendorDto, req: Request) {
    try {
      const { name, inventory_type } = body;

      if (inventory_type == 0 || inventory_type > 3) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'please select valid inventory type',
          null,
          req,
        );
      }

      const isSameName = await this._vendorRepo.findOne({
        where: {
          name: name,
        },
      });

      if (isSameName) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Vendor already exist with this name!',
          null,
          req,
        );
      }

      const payload = {
        name,
        inventory_type,
      };

      const createVendor = this._vendorRepo.create(payload);
      const saveVendor = await this._vendorRepo.save(createVendor);

      if (!saveVendor) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'server unable to create vendor!',
          null,
          req,
        );
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Vendor added successfully!',
        saveVendor,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updateVendor(body: UpdateVendorDto, req: Request) {
    try {
      const { id, name, inventory_type } = body;

      const findByID = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .where('id = :id AND deleted_at IS NULL', { id })
        .getOne();

      if (!findByID) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Vendor may be deleted or Invalid vendor id provided !',
          null,
          req,
        );
      }

      const updateVendor = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .update()
        .set({
          name: name,
          inventory_type: inventory_type,
        })
        .where('id = :id AND deleted_at IS NULL', { id })
        .execute();

      const findUpdateOne = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .where('id = :id AND deleted_at IS NULL', { id })
        .getOne();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Vendor updated successfully!',
        findUpdateOne,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deleteVendor(body: DeleteVendorDto, req: Request) {
    try {
      const { id } = body;

      const findByID = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .where('id = :id AND deleted_at IS NULL', { id })
        .getOne();

      if (!findByID) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Vendor may be already deleted or Invalid vendor id provided !',
          null,
          req,
        );
      }

      await this._vendorRepo
        .createQueryBuilder('Vendors')
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('id = :id AND deleted_at IS NULL', { id })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Vendor deleted successfully!',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllVendors(req: Request) {
    try {
      const getAllVendors = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .where('deleted_at IS NULL')
        .getMany();

      return this.res.generateResponse(
        HttpStatus.OK,
        'All vendoer list',
        getAllVendors,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllVendorsWithPagination(params: PaginationDto, req: Request) {
    try {
      const { searchStr, page, pagesize } = params;

      const getWithoutSearch = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .setFindOptions({
          skip: (parseInt(page) - 1) * parseInt(pagesize),
          take: parseInt(pagesize),
        })
        .where('deleted_at IS NULL AND name LIKE :searchStr', {
          searchStr: `%${searchStr}%`,
        })
        .getMany();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Vendor List',
        getWithoutSearch,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllVendorsOrderReport(req: Request) {
    try {
      const completedOrders = await this._vendorRepo.query(`

            SELECT v.id, v.name,COUNT(*) AS count FROM  orders AS o
            LEFT JOIN e_sim_plans AS ep ON ep.id = o.plan_id
            LEFT JOIN vendors AS v ON v.id = ep.vendor_id
            WHERE o.status = 'COMPLETED'
            GROUP BY v.id

            `);

      // console.log(completedOrders);

      const pendingOrders = await this._vendorRepo.query(`

            SELECT v.id, v.name,COUNT(*) AS count FROM  orders AS o
            LEFT JOIN e_sim_plans AS ep ON ep.id = o.plan_id
            LEFT JOIN vendors AS v ON v.id = ep.vendor_id
            WHERE o.status = 'PENDING'
            GROUP BY v.id

            `);

      const cancelledOrders = await this._vendorRepo.query(`

            SELECT v.id, v.name,COUNT(*) AS count FROM  orders AS o
            LEFT JOIN e_sim_plans AS ep ON ep.id = o.plan_id
            LEFT JOIN vendors AS v ON v.id = ep.vendor_id
            WHERE o.status = 'CANCELLED'
            GROUP BY v.id

            `);

      const data = completedOrders.map((ele) => {
        const temp = {
          id: ele.id,
          name: ele.name,
          completedOrders: parseInt(ele?.count),
        };

        const _pendingOrders = pendingOrders.find(
          (p_ele) => p_ele.id == ele.id,
        )?.count;
        const _cancelledOrders = cancelledOrders.find(
          (p_ele) => p_ele.id == ele.id,
        )?.count;

        temp['pendingOrders'] = parseInt(_pendingOrders);
        temp['cancelledOrders'] = parseInt(_cancelledOrders);

        return temp;
      });

      return this.res.generateResponse(HttpStatus.OK, 'Report', data, req);
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

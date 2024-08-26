import { HttpCode, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Countries } from 'src/entities/country.entity';
import { eSimPlans } from 'src/entities/esim_plan.entity';
import { Vendors } from 'src/entities/vendors.entity';
import { ResponseService } from 'src/shared/services/response.service';
import { In, IsNull, Like, Repository } from 'typeorm';
import {
  CreatePlanDto,
  DeleteMultiplePlanDto,
  DeletePlanDto,
  PaginationDto,
  UpadtePlanDto,
} from './esim-plan.dto';
import { Request } from 'express';
import * as fs from 'fs';
import { parse } from 'csv-parse';
import { FILE } from 'dns';
import { AssignPlanToWl } from 'src/entities/wl_assign_plan.entity';
import * as csv from 'csv-parser';

@Injectable()
export class EsimPlanService {
  constructor(
    @InjectRepository(eSimPlans)
    private readonly _eSimPlansRepo: Repository<eSimPlans>,
    @InjectRepository(Vendors)
    private readonly _vendorRepo: Repository<Vendors>,
    @InjectRepository(Countries)
    private readonly _countryRepo: Repository<Countries>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @InjectRepository(AssignPlanToWl)
    private readonly _assignPlanRepo: Repository<AssignPlanToWl>,
  ) {}

  // *** IMPORTANT-NOTE ***
  // there are two type of plan
  // 1 FOR MANUAL
  // 2 FOR API

  async createPlan(body: CreatePlanDto, req: Request) {
    try {
      const { countries, vendor } = body;

      const Vendor: Vendors = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .where('deleted_at IS NULL AND id = :vendor', { vendor })
        .getOne();

      const allCountries: Countries[] = await this._countryRepo.find({
        where: {
          id: In(countries),
        },
      });

      const payload: any = {
        ...body,
        countries: allCountries,
        vendor: vendor,
      };

      const createPlan = this._eSimPlansRepo.create(payload);
      await this._eSimPlansRepo.save(createPlan);

      console.log(body.plan_name);
      return this.res.generateResponse(
        HttpStatus.OK,
        'Plan created successfully',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updatePlan(body: UpadtePlanDto, req: Request) {
    try {
      const {
        plan_id,
        isRegional,
        countries,
        vendor,
        cost_price,
        wholesale_price,
        region,
        retail_price,
        platinum_price,
        data,
        global_plan,
        package_name,
        plan_name,
        plan_type,
        test_plan,
        validity,
        description,  // Added description
        recharge_only,
      } = body;
  
      const isExist: eSimPlans = await this._eSimPlansRepo
        .createQueryBuilder('eSimPlans')
        .where('deleted_at IS NULL AND id = :plan_id', { plan_id })
        .getOne();
  
      if (!isExist) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Plan does not exist!',
          null,
          req,
        );
      }
  
      const Vendor: Vendors = await this._vendorRepo
        .createQueryBuilder('Vendors')
        .where('deleted_at IS NULL AND id = :vendor', { vendor })
        .getOne();
  
      const allCountries: Countries[] = await this._countryRepo.find({
        where: {
          id: In(countries),
        },
      });
  
      const plan: eSimPlans = await this._eSimPlansRepo.findOne({
        where: {
          id: plan_id,
        },
        relations: {
          countries: true,
          vendor: true,
        },
      });
  
      plan.countries = allCountries;
      plan.vendor = Vendor;
      plan.plan_name = plan_name;
      plan.cost_price = cost_price;
      plan.wholesale_price = wholesale_price;
      plan.region = region;
      plan.retail_price = retail_price;
      plan.data = data;
      plan.global_plan = global_plan;
      plan.package_name = package_name;
      plan.plan_type = plan_type;
      plan.test_plan = test_plan;
      plan.validity = validity;
      plan.updated_at = new Date();
      plan.isRegional = isRegional;
      plan.recharge_only = recharge_only;
      plan.platinum_price = platinum_price;
      plan.description = description;  // Set the description
  
      await this._eSimPlansRepo.save(plan);
  
      return this.res.generateResponse(
        HttpStatus.OK,
        'Plan updated successfully',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deletePlan(id: string, req: Request) {
    try {
      const isExist: eSimPlans = await this._eSimPlansRepo
        .createQueryBuilder('eSimPlans')
        .where('id = :plan_id AND deleted_at IS NULL', {
          plan_id: parseInt(id),
        })
        .getOne();

      if (!isExist) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Plan not exist !',
          null,
          req,
        );
      }

      const deletePlan = await this._eSimPlansRepo
        .createQueryBuilder('eSimPlans')
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('id = :plan_id', { plan_id: parseInt(id) })
        .execute();

      const deleteFromAssignRecord = await this._assignPlanRepo
        .createQueryBuilder()
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('plan_id = :plan_id', { plan_id: parseInt(id) })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Plan deleted successfully!',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deleteAll(body: DeleteMultiplePlanDto, req: Request) {
    try {
      const { plan_ids } = body;

      const deletePlan = await this._eSimPlansRepo
        .createQueryBuilder('eSimPlans')
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('id In(:...plan_ids)', { plan_ids: plan_ids })
        .execute();

      const deleteFromAssignRecord = await this._assignPlanRepo
        .createQueryBuilder()
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('plan_id In(:...plan_ids)', { plan_ids: plan_ids })
        .execute();

      return this.res.generateResponse(
        HttpStatus.OK,
        'Plan deleted successfully!',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllplan(req: Request) {
    try {
      const plans: eSimPlans[] = await this._eSimPlansRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          countries: true,
          vendor: true,
        },
      });

      return this.res.generateResponse(HttpStatus.OK, 'Plan list', plans, req);
    } catch (error) {
      console.log(error);
      return this.res.generateError(error, req);
    }
  }

  async getAllPlanWithPagination(params: PaginationDto, req: Request) {
    try {
      const { searchStr, page, pagesize } = params;

      const plans: eSimPlans[] = await this._eSimPlansRepo.find({
        where: {
          deleted_at: IsNull(),
          plan_name: Like(`%${searchStr}%`),
        },
        skip: (parseInt(page) - 1) * parseInt(pagesize),
        take: parseInt(pagesize),
      });

      const totalPlans = await this._eSimPlansRepo
        .createQueryBuilder('eSimPlans')
        .where('deleted_at IS NULL AND plan_name LIKE :searchStr', {
          searchStr: `%${searchStr}%`,
        })
        .getCount();

      const response = {
        page,
        pagesize,
        total: totalPlans,
        list: plans,
      };

      return this.res.generateResponse(
        HttpStatus.OK,
        'Plans list',
        response,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getEsimByPLanID(id: string, req: Request) {
    try {
      const findPlan = await this._eSimPlansRepo.findOne({
        where: {
          id: parseInt(id),
          deleted_at: IsNull(),
        },
        relations: {
          countries: true,
          vendor: true,
        },
      });

      if (!findPlan) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Esim plan not found!',
          null,
          req,
        );
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Esim Plan!',
        findPlan,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async uploadPlansFromSheet(req: Request) {
    try {
      const rows: any[] = [];

      const FILE_PROMISE = new Promise((resolve, reject) => {
        fs.createReadStream(`${process.cwd()}/14-07-2024-rate-card.csv`)
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', () => resolve(rows))
          .on('error', (error) => reject(error));
      });
      // }

      await FILE_PROMISE.finally();

      for (const plan of rows) {
        // console.log(plan);
        // return
        const findPlan = await this._eSimPlansRepo.findOne({
          where: {
            id: plan.id != '' ? parseInt(plan.id) : 0,
          },
        });

        // console.log(findPlan);

        if (findPlan) {
          console.log(findPlan, 'UPDATED');

          const vendor = await this._vendorRepo.findOne({
            where: {
              id: parseInt(plan.vendor_id),
            },
          });
          // console.log(await this.getCountriesIds(plan.countries));
          // return
          findPlan.countries = await this.getCountriesIds(plan.countries);
          await this._eSimPlansRepo.save(findPlan);

          const update = await this._eSimPlansRepo
            .createQueryBuilder()
            .update()
            .set({
              plan_name: plan.plan_name,
              region: plan.region,
              plan_type: parseInt(plan.plan_type),
              data: plan.data,
              validity: plan.validity,
              package_name: plan.package_name,
              retail_price: plan.retail_price,
              wholesale_price: plan.wholesale_price,
              platinum_price: plan.platinum_price,
              cost_price: plan.cost_price,
              vendor: vendor,
              singleUse: plan.singleUse == '0' ? false : true,
              test_plan: plan.test_plan == '0' ? false : true,
              global_plan: plan.global_plan == '0' ? false : true,
              isRegional: plan.isRegional == '0' ? false : true,
              recharge_only: plan.recharge_only == '0' ? false : true,
              description:plan.description,
              deleted_at: plan.deleted_at == '\\N' ? null : plan.deleted_at,
            })
            .where('id = :id', { id: parseInt(plan.id) })
            .execute();

          // console.log(update);
        } else {
          console.log(plan, 'CREATING');
          const Vendor: Vendors = await this._vendorRepo
            .createQueryBuilder('Vendors')
            .where('deleted_at IS NULL AND id = :vendor', {
              vendor: plan.vendor_id,
            })
            .getOne();

          const allCountries: Countries[] = await this.getCountriesIds(
            plan.countries,
          );

          // console.log(allCountries);

          const {
            countries,
            vendor_id,
            deleted_at,
            updated_at,
            id,
            created_at,
            ...rest_detials
          } = plan;

          const payload: any = {
            ...rest_detials,
            countries: allCountries,
            vendor: Vendor,
            singleUse: rest_detials.singleUse == '0' ? false : true,
            test_plan: rest_detials.test_plan == '0' ? false : true,
            global_plan: rest_detials.global_plan == '0' ? false : true,
            isRegional: rest_detials.isRegional == '0' ? false : true,
            recharge_only: rest_detials.recharge == '0' ? false : true,
          };

          const createPlan = this._eSimPlansRepo.create(payload);
          await this._eSimPlansRepo.save(createPlan);

          console.log('CREATED: ', plan.plan_name);
        }
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Plan updated successfully',
        null,
        req,
      );

      // await fs.createReadStream(`${process.cwd()}/Live-Plans-4_April-2024-sm_live.csv`)
      // .pipe(parse({delimiter: ','}))
      // .on('data', async (row)=>{

      //     console.log(row)
      // const findPlan = await this._eSimPlansRepo.findOne({
      //     where: {
      //         deleted_at: IsNull(),
      //         id: parseInt(row[0]),
      //         wholesale_price: row.wholesale_price,
      //         retail_price: row.retail_price,
      //         cost_price: row.cost_price
      //     }
      // })

      // if(findPlan){

      //     await this._eSimPlansRepo.createQueryBuilder()
      //     .update()
      //     .set({
      //     package_name: row[7]
      //     })
      //     .where('id = :id', {id: row[0]})
      //     .execute()

      //     console.log(`plan id found ${parseInt(row[0])}`);
      // }
      // if(!findPlan){
      //     console.log(`plan id not found ${parseInt(row[0])}`)
      // }
      // const isUpdate = await this._eSimPlansRepo.createQueryBuilder('eSimPlans')
      // .update()
      // .set({
      //     global_plan: row.global_plan,
      //     region: row.region,
      //     plan_type: row.plan_type,
      //     data: row.data,
      //     validity: row.validity,
      //     package_name: row.package_name,
      //     retail_price: row.retail_price,
      //     wholesale_price: row.wholesale_price,
      //     cost_price: row.cost_price,
      //     singleUse: row.singleUse,
      //     test_plan: row.test_plan,
      //     isRegional: row.is_Regional == '0' ? false : true,
      // })
      // .where("deleted_at IS NULL and id = :id", {id: parseInt(row.id)})
      // .execute()
      // console.log(isUpdate, row.id)
      //         console.log("current id", row.isRegional)
      //         // const plan: CreatePlanDto = {
      //         //     plan_name: row.plan_name,
      //         //     global_plan: row.global_plan == '1'? true : false,
      //         //     region: row.region,
      //         //     plan_type: 2,
      //         //     countries: await this.getCountriesIds(row.countries),
      //         //     data: row.data,
      //         //     validity: row.validity,
      //         //     vendor: await this.getVendor(row.vendor),
      //         //     package_name: row.package_name,
      //         //     retail_price: row.retail_price,
      //         //     wholesale_price: row.wholesale_price,
      //         //     cost_price: row.cost_price,
      //         //     test_plan: row.test_plan == '1'? true : false,
      //         //     singleUse: row.singleUse == '1'? true : false,
      //         //     isRegional: row.isRegional == '1'? true : false

      //         // }
      //         // const uploaded = await this.createPlan(plan, req)
      //         // console.log(uploaded)

      // })

      // return true;
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getCountriesIds(codes: string): Promise<Countries[]> {
    let codesArry = codes.split(',');
    codesArry = codesArry.map((ele) => {
      return ele.trim();
    });

    console.log(codesArry);

    const findALL: Countries[] = await this._countryRepo.find({
      where: [
        {
          deleted_at: IsNull(),
          country_code: In(codesArry),
        },
        {
          deleted_at: IsNull(),
          iso3: In(codesArry),
        },
      ],
    });

    return findALL;
  }

  async getVendor(name: string) {
    let _nameVendor;
    if (name == 'Keep GO') {
      _nameVendor = 'keep go';
    }
    if (name == 'AIRALO') {
      _nameVendor = 'Airalo';
    }
    if (name == 'Esim-Go') {
      _nameVendor = 'esim-go';
    }

    const findOneVedor = await this._vendorRepo.findOne({
      where: {
        name: _nameVendor,
        deleted_at: IsNull(),
      },
    });

    return findOneVedor.id;
  }
}

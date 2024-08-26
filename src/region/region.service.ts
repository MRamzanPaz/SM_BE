import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Regions } from 'src/entities/region.entity';
import { ResponseService } from 'src/shared/services/response.service';
import { In, IsNull, Like, Repository } from 'typeorm';
import {
  AddRegionDto,
  CountriesWiseDto,
  DeleteRegionDto,
  UpdateRegion,
} from './region.dto';
import { Request } from 'express';
import { Countries } from 'src/entities/country.entity';

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(Countries)
    private readonly _countryRepo: Repository<Countries>,
    @InjectRepository(Regions)
    private readonly _regionRepo: Repository<Regions>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
  ) {}

  async addRegion(body: AddRegionDto, req: Request) {
    try {
      const { name, countries } = body;
      const isExsistReg = await this._regionRepo
        .createQueryBuilder('Regions')
        .where('region_name = :name AND deleted_at IS NULL', { name })
        .getMany();

      if (isExsistReg.length) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Region already exsist by this name',
          null,
          req,
        );
      }

      const allCountries: Countries[] = await this._countryRepo.find({
        where: {
          id: In(countries),
        },
      });

      const region: Regions = this._regionRepo.create({
        region_name: name,
        countries: allCountries,
      });
      await this._regionRepo.save(region);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Region added successfully!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getAllRegionList(req: Request) {
    try {
      const allRegions = await this._regionRepo.find({
        where: {
          deleted_at: IsNull(),
        },
        relations: {
          countries: true,
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'Region List',
        allRegions,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getCountriesRegionWise(params: CountriesWiseDto, req: Request) {
    try {
      const { region_id } = params;
      const region = await this._regionRepo.findOne({
        where: {
          id: parseInt(region_id),
        },
        relations: {
          countries: true,
        },
      });

      if (!region) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Region dose not exist!',
          null,
          req,
        );
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Country list',
        region,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async getCountriesByRegionName(region_name: string, req: Request) {
    try {
      const region: Regions = await this._regionRepo.findOne({
        where: {
          region_name: region_name,
          deleted_at: IsNull(),
        },
        relations: {
          countries: true,
        },
      });

      if (!region) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Region dose not exist!',
          null,
          req,
        );
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Country list',
        region,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async updateRegion(body: UpdateRegion, req: Request) {
    try {
      const { id, name, countries } = body;

      const isExist = await this._regionRepo
        .createQueryBuilder('Regions')
        .where('id = :region_id AND deleted_at IS NULL', { region_id: id })
        .getOne();

      if (!isExist) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Region dose not exist!',
          null,
          req,
        );
      }

      const allCountries: Countries[] = await this._countryRepo.find({
        where: {
          id: In(countries),
        },
      });

      const region = await this._regionRepo.findOne({
        where: {
          id: id,
        },
        relations: {
          countries: true,
        },
      });
      region.region_name = name;
      region.countries = allCountries;
      region.updated_at = new Date();

      await this._regionRepo.save(region);

      return this.res.generateResponse(
        HttpStatus.OK,
        'Region updated successfully !',
        region,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async deleteRegion(body: DeleteRegionDto, req: Request) {
    try {
      const { region_id } = body;
      const findOne = await this._regionRepo
        .createQueryBuilder('Regions')
        .update()
        .set({
          deleted_at: new Date(),
        })
        .where('id = :region_id AND deleted_at IS NULL', { region_id })
        .execute();

      if (!findOne.affected) {
        return this.res.generateResponse(
          HttpStatus.BAD_REQUEST,
          'Region is not exist !',
          null,
          req,
        );
      }
      return this.res.generateResponse(
        HttpStatus.OK,
        'Region deleted successfully!',
        null,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { isNull } from 'lodash';
import { Cities } from 'src/entities/cities.entity';
import { Countries } from 'src/entities/country.entity';
import { States } from 'src/entities/states.entity';
import { xcities } from 'src/entities/xcities.entity';
import { ApiService } from 'src/shared/services/api.service';
import { ResponseService } from 'src/shared/services/response.service';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Countries)
    private readonly _countryRepo: Repository<Countries>,
    @InjectRepository(States)
    private readonly _stateRepo: Repository<States>,
    @InjectRepository(Cities)
    private readonly _cityRepo: Repository<Cities>,
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('API-SERVICE') private _api: ApiService,
  ) {}

  async getAllCountries(req: Request) {
    try {
      const allCountries: Countries[] = await this._countryRepo.find({
        where: {
          deleted_at: null,
        },
        relations: {
          // states: {
          //     cities: true
          // }
        },
      });

      return this.res.generateResponse(
        HttpStatus.OK,
        'All countries list',
        allCountries,
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }

  async addAllCountries(req: Request) {
    try {
      // add all countries
      // const countryList:any[] = await this._api.getCountries();
      // for(const country of countryList){

      //     const isExist = await this._countryRepo.findOne({
      //         where: {
      //             deleted_at: IsNull(),
      //             country_code: country.country_code
      //         }
      //     })

      //     if (!isExist) {
      //         const saveCountries = await this._countryRepo.createQueryBuilder('Countries')
      //         .insert()
      //         .values([country])
      //         .execute()

      //         const allCountries: Countries[] = await this._countryRepo.createQueryBuilder('Countries')
      //         .where("deleted_at IS NULL")
      //         .getMany()

      //         for ( const country1 of allCountries ){
      //             const {country_code, id} = country1;
      //             const details: any = await this._api.getCountryDetails(country_code);
      //             await this._countryRepo.update({id: id}, {iso2: details.iso2, iso3: details.iso3, phone_code: details.phonecode})
      //         }
      //     }

      // }

      // add all country states
      // const allCountries = await this._countryRepo.createQueryBuilder('Countries')
      // .where("deleted_at IS NULL")
      // .getMany()

      // for(const country of allCountries){
      //     const states = await this._api.getStateByCountry(country.country_code);

      //     console.log(states);
      //     console.log(country.id,country.country_name, "TOTAL-STATE: ",states.length);

      //    for(const state of states){
      //         const isStatesExist = await this._stateRepo.findOne({
      //             where: {
      //                 deleted_at: IsNull(),
      //                 state_name: state.name,
      //                 country: {
      //                     id: country.id
      //                 }
      //             }
      //         })

      //         if (!isStatesExist) {
      //             const newState = this._stateRepo.create({
      //                 state_name: state.name,
      //                 state_code: state.iso2,
      //                 country: country
      //             })
      //             await this._stateRepo.save(newState)

      //         }

      //    }

      // }

      // add all states cities
      const allCountriesWithStates = await this._countryRepo.find({
        where: {
          deleted_at: IsNull(),
          // id: MoreThan(246),
          // states: {
          //     id: Not(1561)
          // }
        },
        relations: {
          states: {
            cities: true,
          },
        },
      });

      // 125
      console.log(allCountriesWithStates[0]);

      for (const country of allCountriesWithStates) {
        if (country.states.length) {
          for (const state of country.states) {
            if (!state.cities.length) {
              const Cities: any[] = await this._api.getCityByStateAndCountry(
                country.country_code,
                state.state_code,
              );
              // console.log(Cities);

              for (const city of Cities) {
                console.log(
                  country.id,
                  '',
                  country.country_name,
                  '',
                  state.state_name,
                  '',
                  city.name,
                );
                const isExistCity = await this._cityRepo.findOne({
                  where: {
                    state: {
                      id: state.id,
                    },
                    city_name: city.name,
                  },
                });

                if (!isExistCity) {
                  const newCity = this._cityRepo.create({
                    city_name: city.name,
                    state: state,
                  });
                  await this._cityRepo.save(newCity);
                }
              }
            }
          }
        }
        //     const states = await this._api.getStateByCountry(country.country_code);

        //     console.log(states);
        //     console.log(country.id,country.country_name, "TOTAL-STATE: ",states.length);

        //    for(const state of states){
        //         const isStatesExist = await this._stateRepo.findOne({
        //             where: {
        //                 deleted_at: IsNull(),
        //                 state_code: state.iso2
        //             }
        //         })

        //         if (!isStatesExist) {
        //             const newState = this._stateRepo.create({
        //                 state_name: state.name,
        //                 state_code: state.iso2,
        //                 country: country
        //             })
        //             await this._stateRepo.save(newState)

        //         }

        //    }
      }

      return this.res.generateResponse(
        HttpStatus.OK,
        'Countries added successfully!',
        [],
        req,
      );
    } catch (error) {
      return this.res.generateError(error, req);
    }
  }
}

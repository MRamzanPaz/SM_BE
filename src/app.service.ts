import { Inject, Injectable } from '@nestjs/common';
import { ApiService } from './shared/services/api.service';

@Injectable()
export class AppService {
  constructor(@Inject('API-SERVICE') private _api: ApiService) {}

  async getHello() {
    return {
      code: 1,
      msg: 'Api is working fine and !!! health 100%',
    };
  }

  async refundEsimGoBundles() {
    try {
      const inventory = await this._api.getEsimGoInventory();

      const availableBundles = inventory.bundles[0].available;

      let count = 1;

      for (const bundle of availableBundles) {
        const payload = {
          usageId: bundle.id,
          quantity: 1,
        };

        const ref = await this._api.esimGOrefundInventory(payload);
        console.log(count, ref);
        count++;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}

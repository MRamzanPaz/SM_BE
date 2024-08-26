import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/entities/users.entity';
import { Wl_Account } from 'src/entities/wl_account.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GeneralService {
  constructor(
    @InjectRepository(Users)
    private readonly _userRepo: Repository<Users>,
    @InjectRepository(Wl_Account)
    private readonly _wlAccountRepo: Repository<Wl_Account>,
  ) {}

  async verifyUser(decodedToken: any, token: string) {
    let ret = false;
    const { id } = decodedToken;
    const isValid = await this._userRepo
      .createQueryBuilder('Users')
      .where('id = :id AND auth_token = :token', { id: id, token })
      .getOne();

    if (isValid) {
      ret = true;
    }
    return ret;
  }

  async verifyWLAcc(decodedToken: any, token: string) {
    let ret = false;
    const { id } = decodedToken;
    const isValid = await this._wlAccountRepo
      .createQueryBuilder('Wl_Account')
      .where(
        'id = :id AND access_token = :token AND deleted_at IS NULL AND active = :active',
        { id, token, active: true },
      )
      .getOne();

    if (isValid) {
      ret = true;
    }
    return ret;
  }
}

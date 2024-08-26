import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wl_Account } from './wl_account.entity';

@Entity()
export class ShopifyWebHooks {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: null,
    nullable: false,
  })
  access_id: string;

  @Column({
    default: null,
    nullable: false,
  })
  base_url: string;

  @Column({
    default: null,
    nullable: false,
  })
  webhook_url: string;

  @OneToOne(() => Wl_Account)
  @JoinColumn({
    name: 'wl_id',
  })
  whitelabel: Wl_Account;

  @CreateDateColumn({
    type: 'datetime',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'datetime',
  })
  updated_at: Date;

  @Column({
    type: 'datetime',
    default: null,
  })
  deleted_at: Date;
}

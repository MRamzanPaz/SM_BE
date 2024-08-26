/* eslint-disable prettier/prettier */
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssignPlanToWl } from './wl_assign_plan.entity';
import { Orders } from './order.entity';
import { Wallet_Transaction } from './wallet_transaction.entity';
import { ActivatedESims } from './activatedEsims.entity';
import { RefundController } from 'src/refund/refund.controller';
import { RefundActivities } from './refundActivity.entity';

@Entity()
export class Wl_Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: '',
    nullable: false,
  })
  username: string;

  @Column({
    default: '',
    nullable: false,
  })
  password: string;

  @Column({
    default: '',
    nullable: false,
  })
  email: string;

  @Column({
    default: null,
    nullable: true,
  })
  contact_no: string;

  @Column({
    default: null,
    nullable: true,
    type: 'longtext',
  })
  auth_token: string;

  @Column({
    default: null,
    nullable: true,
    type: 'longtext',
  })
  access_token: string;

  @Column({
    type: 'decimal',
    default: 0,
    precision: 6,
    scale: 2,
  })
  wallet_balance: number;

  @Column({
    default: true,
    nullable: false,
  })
  active: boolean;

  @Column({
    default: null,
    nullable: true,
  })
  otp_token: string;

  @Column({
    type: 'datetime',
    default: null,
  })
  expires_at: Date;

  @OneToMany(() => AssignPlanToWl, (apw) => apw.wl_account)
  assign_plan_wl: AssignPlanToWl[];

  @OneToMany(() => Orders, (order) => order.wl_id)
  orders: Orders[];

  @OneToMany(() => ActivatedESims, (activated) => activated.wl_account)
  activated_esims: ActivatedESims[];

  @OneToMany(() => Wallet_Transaction, (transactions) => transactions.wl_id)
  transactions: Wallet_Transaction[];

  @OneToMany(() => RefundActivities, (refund) => refund.whitelabel)
  refunds: RefundActivities[];

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

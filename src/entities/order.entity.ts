import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { eSimPlans } from './esim_plan.entity';
import { Wl_Account } from './wl_account.entity';
import { OrderDetails } from './order_details.entity';
import { Wallet_Transaction } from './wallet_transaction.entity';

@Entity()
export class Orders {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => eSimPlans, (plan) => plan.orders)
  @JoinColumn({ name: 'plan_id' })
  plan_id: eSimPlans;

  @ManyToOne(() => Wl_Account, (WL) => WL.orders)
  @JoinColumn({ name: 'wl_id' })
  wl_id: Wl_Account;

  @Column({
    nullable: true,
    default: null,
  })
  order_id: string;

  @Column({
    nullable: true,
    default: null,
  })
  shopify_orderNo: string;

  @Column({
    nullable: true,
    default: null,
  })
  status: string;

  // @Column({
  //     nullable: true,
  //     default: null
  // })
  // email: string;

  @Column({
    nullable: true,
    default: null,
  })
  reason: string;

  @Column({
    nullable: false,
    default: null,
  })
  isRetailPrice: Boolean;

  @Column({
    nullable: false,
    default: null,
  })
  price_mode: number;

  @OneToOne(() => OrderDetails)
  @JoinColumn({
    name: 'detial_id',
  })
  order_details: OrderDetails;

  @OneToOne(() => Wallet_Transaction, { nullable: true })
  @JoinColumn({ name: 'trans_id' })
  transaction: Wallet_Transaction;

  @Column({
    nullable: true,
    default: false,
  })
  systemGenerated: Boolean;

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

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
import { Wallet_Transaction } from './wallet_transaction.entity';
import { VendorsOrder } from './vendorOrders.entity';

@Entity()
export class TopUpHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    default: null,
  })
  iccid: string;

  @Column({
    nullable: true,
    default: null,
  })
  order_no: string;

  @ManyToOne(() => eSimPlans, (plan) => plan)
  @JoinColumn({ name: 'plan_id' })
  plan: eSimPlans;

  @OneToOne(() => Wallet_Transaction)
  @JoinColumn({
    name: 'wt_id',
  })
  wallet_transaction: Wallet_Transaction;

  @OneToOne(() => VendorsOrder)
  @JoinColumn({ name: 'vo_id' })
  vendors_order: VendorsOrder;

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

  @Column({
    nullable: true,
    default: null,
  })
  status: string;
}

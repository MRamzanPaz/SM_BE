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
import { Orders } from './order.entity';
import { Wl_Account } from './wl_account.entity';

@Entity()
export class RefundActivities {
  @PrimaryGeneratedColumn()
  id: number;

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
    default: null,
  })
  status: string;

  @Column({
    default: null,
  })
  note: string;

  @Column({
    default: null,
  })
  order_no: string;

  @OneToOne(() => Orders)
  @JoinColumn({ name: 'order_id' })
  order: Orders;

  @ManyToOne(() => Wl_Account, (whitelabel) => whitelabel.refunds)
  whitelabel: Wl_Account;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wl_Account } from './wl_account.entity';

@Entity()
export class Wallet_Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    default: null,
  })
  message: string;

  @Column({
    nullable: true,
    default: null,
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  credit: number;

  @Column({
    nullable: true,
    default: null,
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  debit: number;

  @Column({
    nullable: true,
    default: null,
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  balance: number;

  @ManyToOne(() => Wl_Account, (account) => account.transactions)
  @JoinColumn({
    name: 'wl_id',
  })
  wl_id: Wl_Account;

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

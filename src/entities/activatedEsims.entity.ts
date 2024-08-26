import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wl_Account } from './wl_account.entity';

@Entity()
export class ActivatedESims {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: null,
    nullable: false,
  })
  iccid: string;

  @ManyToOne(() => Wl_Account, (wl) => wl.activated_esims)
  @JoinColumn({ name: 'wl_id' })
  wl_account: Wl_Account;

  @Column({
    default: true,
    nullable: false,
  })
  singleUse: Boolean;

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

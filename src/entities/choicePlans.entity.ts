import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vendors } from './vendors.entity';

@Entity()
export class ChoicePlans {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: null,
    nullable: false,
  })
  name: string;

  @Column({
    default: null,
    nullable: false,
  })
  package_code: string;

  @Column({
    default: null,
    nullable: false,
  })
  dft_buff_alloc_size: number;

  @Column({
    default: null,
    nullable: false,
  })
  rate_group_allow_days: number;

  @Column({
    default: null,
    nullable: false,
  })
  rate_group_occurrences: number;

  @Column({
    default: null,
    nullable: false,
    type: 'longtext',
  })
  serving_networks: string;

  @Column({
    default: null,
    nullable: false,
    type: 'longtext',
  })
  imsi_apns: string;

  @Column({
    default: null,
    nullable: false,
    type: 'longtext',
  })
  rate_groups: string;

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

  @ManyToOne(() => Vendors, (Vendors) => Vendors)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendors;
}

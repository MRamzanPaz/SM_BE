import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Regions } from './region.entity';
import { Vendors } from './vendors.entity';

@Entity()
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Vendors, (Vendors) => Vendors)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendors;

  @Column({
    nullable: false,
    default: null,
  })
  iccid: string;

  @Column({
    nullable: false,
    default: null,
  })
  package_name: string;

  @Column({
    default: null,
    nullable: false,
  })
  qr_code: string;

  @Column({
    nullable: true,
    default: null,
  })
  qrcode_url: string;

  @Column({
    nullable: true,
    default: null,
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  cost_price: number;

  @Column({
    nullable: false,
    default: 'IN-STOCK',
  })
  status: string;

  @Column({
    nullable: true,
    default: null,
  })
  apn: string;

  @Column({
    nullable: true,
    default: null,
  })
  data_roaming: string;

  @Column({
    nullable: true,
    default: null,
  })
  msisdn: string;

  @Column({
    nullable: true,
    default: null,
  })
  voicemail_system: string;

  @Column({
    nullable: true,
    default: null,
  })
  state: string;

  @Column({
    nullable: true,
    default: null,
  })
  rate_center: string;

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

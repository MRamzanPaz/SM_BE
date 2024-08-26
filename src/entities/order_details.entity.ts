import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VendorsOrder } from './vendorOrders.entity';

@Entity()
export class OrderDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    default: null,
  })
  iccid: string;

  @Column({
    nullable: false,
    default: null,
  })
  qr_code: string;

  @Column({
    nullable: true,
    default: null,
  })
  qrcode_url: string;

  @Column({
    nullable: false,
    default: null,
  })
  data_roaming: string;

  @Column({
    nullable: false,
    default: null,
  })
  apn: string;

  @Column({
    nullable: false,
    default: null,
  })
  package_name: string;

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
}

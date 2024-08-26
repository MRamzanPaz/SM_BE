import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Countries } from './country.entity';
import { Vendors } from './vendors.entity';
import { AssignPlanToWl } from './wl_assign_plan.entity';
import { Orders } from './order.entity';

@Entity()
export class eSimPlans {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: null,
    nullable: false,
  })
  plan_name: string;

  @Column({
    default: false,
    nullable: true,
  })
  global_plan: Boolean;

  @Column({
    default: false,
    nullable: true,
  })
  recharge_only: Boolean;

  // @Column({
  //     default: false,
  //     nullable: false
  // })
  // is_Regional: Boolean;

  @Column({
    default: null,
    nullable: true,
  })
  region: string;

  @Column({
    default: null,
    nullable: true,
  })
  plan_type: number;

  @ManyToMany(() => Countries)
  @JoinTable()
  countries: Countries[];

  @Column({
    default: null,
    nullable: true,
  })
  data: string;

  @Column({
    default: null,
    nullable: true,
  })
  validity: string;

  @ManyToOne(() => Vendors, (Vendors) => Vendors)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendors;

  @Column({
    default: null,
    nullable: false,
  })
  package_name: string;

  @Column({
    default: null,
    nullable: false,
  })
  retail_price: string;

  @Column({
    default: null,
    nullable: false,
  })
  wholesale_price: string;

  @Column({
    default: null,
    nullable: false,
  })
  platinum_price: string;

  @Column({
    default: null,
    nullable: false,
  })
  cost_price: string;

  @Column({
    default: false,
    nullable: true,
  })
  singleUse: Boolean;

  @Column({
    default: false,
    nullable: true,
  })
  test_plan: Boolean;

  @Column({
    default: false,
    nullable: true,
  })
  isRegional: Boolean;

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
  
  @Column({
    nullable: true,
    default: null,
  })
  description: string;
  @OneToMany(() => AssignPlanToWl, (apw) => apw.plan)
  assign_plan_wl: AssignPlanToWl[];

  @OneToMany(() => Orders, (order) => order.plan_id)
  orders: Orders[];

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

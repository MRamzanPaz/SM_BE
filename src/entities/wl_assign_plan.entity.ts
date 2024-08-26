import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { eSimPlans } from './esim_plan.entity';
import { Wl_Account } from './wl_account.entity';

@Entity()
export class AssignPlanToWl {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => eSimPlans, (esp) => esp.assign_plan_wl, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: eSimPlans;

  @ManyToOne(() => Wl_Account, (wl) => wl.assign_plan_wl)
  @JoinColumn({ name: 'wl_id' })
  wl_account: Wl_Account;

  @Column({
    nullable: false,
    default: null,
  })
  isRetailPrice: Boolean;

  /**
   * price_mode have three values (1,2,3)
   * 1 for gold(wholesale) price
   * 2 for silver(retail) price
   * 3 for platinum price
   */
  @Column({
    nullable: false,
    default: null,
  })
  price_mode: number;

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
  description: string;
}

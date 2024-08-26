import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class VendorsOrder {
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
    nullable: false,
    default: null,
  })
  reference: string;

  @Column({
    nullable: false,
    default: null,
  })
  iccid: string;

  @Column({
    nullable: false,
    default: null,
  })
  package: string;

  @Column({
    nullable: true,
    default: null,
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  cost_price: number;
}

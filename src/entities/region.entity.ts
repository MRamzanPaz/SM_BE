import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Countries } from './country.entity';

@Entity()
export class Regions {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: null,
    nullable: false,
  })
  region_name: string;

  @ManyToMany(() => Countries)
  @JoinTable()
  countries: Countries[];

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

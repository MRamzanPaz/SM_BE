import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Devices {
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
    nullable: false,
  })
  model: string;

  @Column({
    default: null,
    nullable: false,
  })
  os: string;

  @Column({
    default: null,
    nullable: false,
  })
  brand: string;

  @Column({
    default: null,
    nullable: false,
  })
  name: string;
}

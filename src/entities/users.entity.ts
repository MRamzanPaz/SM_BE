/* eslint-disable prettier/prettier */
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    nullable: false,
    default: '',
  })
  username: string;

  @Column({
    unique: true,
    nullable: true,
    default: '',
  })
  email: string;

  @Column({
    unique: false,
    nullable: true,
    default: '',
  })
  firstname: string;

  @Column({
    unique: false,
    nullable: true,
    default: '',
  })
  lastname: string;

  @Column({
    unique: false,
    nullable: false,
    default: '',
  })
  password: string;

  @Column({
    unique: false,
    nullable: false,
    default: '',
  })
  role: string;

  @Column({
    unique: false,
    nullable: true,
    type: 'longtext',
    default: null,
  })
  auth_token: string;

  @Column({
    unique: false,
    nullable: true,
    default: '',
  })
  access_token: string;

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

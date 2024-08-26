import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class EmailLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, default: null })
  from: string;

  @Column({ nullable: true, default: null })
  to: string;

  @Column({ nullable: true, default: null })
  bcc: string;

  @Column({ nullable: true, default: null, type: 'longtext' })
  context: string;

  @Column({ nullable: true, default: null })
  template_name: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  update_at: Date;

  @Column({ nullable: true, default: null })
  deleted_at: string;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class xcities {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @Column({
    type: 'varchar',
  })
  name: string;

  @Column({
    type: 'bigint',
  })
  state_id: number;

  @Column({
    type: 'varchar',
  })
  state_code: string;

  @Column({
    type: 'varchar',
  })
  state_name: string;

  @Column({
    type: 'int',
  })
  country_id: number;

  @Column({
    type: 'varchar',
  })
  country_code: string;

  @Column({
    type: 'varchar',
  })
  country_name: string;
}

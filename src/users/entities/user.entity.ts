import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Token } from '../../auth/entities/token.entity';
import { UserVideo } from '../../videos/entities/user-video.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  firstName?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lastName?: string;

  @Column({
    type: 'bit',
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'datetime2',
    nullable: true,
  })
  lastLoginAt?: Date;

  @CreateDateColumn({
    type: 'datetime2',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'datetime2',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Token, (token) => token.user)
  tokens: Token[];

  @OneToMany(() => UserVideo, (userVideo) => userVideo.user)
  userVideos: UserVideo[];

  // Virtual fields
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.email;
  }

  // Methods
  toJSON() {
    const { tokens, userVideos, ...result } = this;
    return {
      ...result,
      fullName: this.fullName,
    };
  }
}
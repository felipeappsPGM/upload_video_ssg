import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TokenType {
  EMAIL_LOGIN = 'EMAIL_LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
}

@Entity('tokens')
@Index(['token', 'type'])
@Index(['userId', 'type'])
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  token: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: TokenType,
    default: TokenType.EMAIL_LOGIN,
  })
  type: TokenType;

  @Column({
    type: 'datetime2',
    nullable: false,
  })
  expiresAt: Date;

  @Column({
    type: 'bit',
    default: false,
  })
  isUsed: boolean;

  @Column({
    type: 'datetime2',
    nullable: true,
  })
  usedAt?: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipAddress?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  userAgent?: string;

  @CreateDateColumn({
    type: 'datetime2',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // Relations
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.tokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.isUsed && !this.isExpired();
  }

  markAsUsed(): void {
    this.isUsed = true;
    this.usedAt = new Date();
  }

  toJSON() {
    const { user, ...result } = this;
    return result;
  }
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Video } from './video.entity';

export enum AccessType {
  ASSIGNED = 'ASSIGNED',
  PURCHASED = 'PURCHASED',
  TRIAL = 'TRIAL',
  ADMIN = 'ADMIN',
}

@Entity('user_videos')
@Unique(['userId', 'videoId'])
@Index(['userId', 'accessType'])
@Index(['videoId', 'accessType'])
export class UserVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: AccessType,
    default: AccessType.ASSIGNED,
  })
  accessType: AccessType;

  @Column({
    type: 'datetime2',
    nullable: true,
    comment: 'When access expires (null = no expiration)',
  })
  expiresAt?: Date;

  @Column({
    type: 'bit',
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'datetime2',
    nullable: true,
  })
  firstViewedAt?: Date;

  @Column({
    type: 'datetime2',
    nullable: true,
  })
  lastViewedAt?: Date;

  @Column({
    type: 'int',
    default: 0,
  })
  viewCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Last watched position in seconds',
  })
  watchPosition: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Completion percentage (0-100)',
  })
  completionPercentage: number;

  @Column({
    type: 'bit',
    default: false,
  })
  isCompleted: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Who granted access',
  })
  grantedBy?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

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
  @Column('uuid')
  userId: string;

  @Column('int')
  videoId: number;

  @ManyToOne(() => User, (user) => user.userVideos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Video, (video) => video.userVideos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  // Methods
  hasAccess(): boolean {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    return true;
  }

  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  markAsViewed(): void {
    this.viewCount += 1;
    this.lastViewedAt = new Date();
    if (!this.firstViewedAt) {
      this.firstViewedAt = new Date();
    }
  }

  updateWatchProgress(position: number, totalDuration: number): void {
    this.watchPosition = position;
    this.completionPercentage = Math.round((position / totalDuration) * 100);
    this.isCompleted = this.completionPercentage >= 90;
  }

  toJSON() {
    const { user, video, ...result } = this;
    return result;
  }
}
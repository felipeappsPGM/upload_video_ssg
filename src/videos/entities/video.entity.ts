import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserVideo } from './user-video.entity';

export enum VideoStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('videos')
@Index(['status', 'isActive'])
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: false,
  })
  url: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  thumbnailUrl?: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Duration in format MM:SS or HH:MM:SS',
  })
  duration?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Duration in seconds',
  })
  durationSeconds?: number;

  @Column({
    type: 'varchar',
    length: 50,
    enum: VideoStatus,
    default: VideoStatus.PUBLISHED,
  })
  status: VideoStatus;

  @Column({
    type: 'bit',
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  category?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Tags separated by comma',
  })
  tags?: string;

  @Column({
    type: 'int',
    default: 0,
  })
  viewCount: number;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'File size in bytes',
  })
  fileSize?: number;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Video resolution (e.g., 1080p, 720p)',
  })
  resolution?: string;

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
  @OneToMany(() => UserVideo, (userVideo) => userVideo.video)
  userVideos: UserVideo[];

  // Virtual fields
  get tagsArray(): string[] {
    return this.tags ? this.tags.split(',').map(tag => tag.trim()) : [];
  }

  // Methods
  isPublished(): boolean {
    return this.status === VideoStatus.PUBLISHED && this.isActive;
  }

  incrementViewCount(): void {
    this.viewCount += 1;
  }

  toJSON() {
    const { userVideos, ...result } = this;
    return {
      ...result,
      tagsArray: this.tagsArray,
    };
  }
}
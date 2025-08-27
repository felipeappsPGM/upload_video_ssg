import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });
  }

  async findOrCreateByEmail(email: string, additionalData?: Partial<User>): Promise<User> {
    let user = await this.findByEmail(email);

    if (!user) {
      const createUserDto: CreateUserDto = {
        email: email.toLowerCase(),
        ...additionalData,
      };
      user = await this.create(createUserDto);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    
    // Soft delete
    user.isActive = false;
    await this.userRepository.save(user);
  }

  async count(): Promise<number> {
    return await this.userRepository.count({
      where: { isActive: true },
    });
  }

  async search(query: string, limit: number = 10, offset: number = 0): Promise<[User[], number]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    queryBuilder
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(user.email LIKE :query OR user.firstName LIKE :query OR user.lastName LIKE :query)',
        { query: `%${query}%` }
      )
      .orderBy('user.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    return await queryBuilder.getManyAndCount();
  }

  async getActiveUsersCount(): Promise<number> {
    return await this.userRepository.count({
      where: { isActive: true },
    });
  }

  async getUsersWithRecentActivity(days: number = 30): Promise<User[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return await this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.lastLoginAt >= :date', { date })
      .orderBy('user.lastLoginAt', 'DESC')
      .getMany();
  }
}
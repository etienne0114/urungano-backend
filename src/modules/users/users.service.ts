import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { BaseService } from '../../common/services/base.service';
import type { UpdateUserDto, SetPinDto, UserResponseDto } from './dto/user.dto';

@Injectable()
export class UsersService extends BaseService<User> {
  private static readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    protected readonly dataSource: DataSource,
  ) {
    super(userRepo, dataSource);
  }

  async createAnonymous(username: string): Promise<User> {
    return this.runInTransaction(async (queryRunner) => {
      const exists = await queryRunner.manager.findOne(User, { where: { username } });
      if (exists) throw new ConflictException('Username already taken');

      const user = queryRunner.manager.create(User, { 
        username, 
        lastActiveDate: new Date() 
      });
      return queryRunner.manager.save(user);
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({ where: { username } });
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findOneOrThrow({ where: { id: id as any } });
    await this.repository.update(id, dto);
    return this.findOneOrThrow({ where: { id: id as any } });
  }

  async setPin(id: string, dto: SetPinDto): Promise<void> {
    const hash = await bcrypt.hash(dto.pin, UsersService.SALT_ROUNDS);
    await this.repository.update(id, { pinHash: hash });
  }

  async verifyPin(id: string, pin: string): Promise<boolean> {
    const user = await this.findOneOrThrow({ where: { id: id as any } });
    if (!user.pinHash) return false;
    return bcrypt.compare(pin, user.pinHash);
  }

  async removePin(id: string): Promise<void> {
    await this.repository.update(id, { pinHash: null });
  }

  async touchStreak(id: string): Promise<void> {
    const user = await this.findOneOrThrow({ where: { id: id as any } });
    const now = new Date();
    const last = user.lastActiveDate;

    let streak = user.dayStreak;
    if (last) {
      const diffDays = Math.floor(
        (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    await this.repository.update(id, { dayStreak: streak, lastActiveDate: now });
  }

  toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      language: user.language,
      dayStreak: user.dayStreak,
      avatarSeed: user.avatarSeed,
      isPrivate: user.isPrivate,
      earnedBadges: user.earnedBadges || [],
      journeyEvents: user.journeyEvents || [],
      totalQuestions: user.totalQuestions || 0,
      correctAnswers: user.correctAnswers || 0,
      hasPIN: !!user.pinHash,
      joinedDate: user.joinedDate,
      lastActiveDate: user.lastActiveDate,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import type { AuthResponseDto } from './dto/auth.dto';
import type { User } from '../users/entities/user.entity';

export interface JwtPayload {
  sub: string;   // user id
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signInAnonymous(username: string): Promise<AuthResponseDto> {
    let user: User;
    let isNewUser = false;

    const existing = await this.usersService.findByUsername(username);
    if (existing) {
      user = existing;
    } else {
      user = await this.usersService.createAnonymous(username);
      isNewUser = true;
    }

    const accessToken = this.issueToken(user);
    return { accessToken, userId: user.id, username: user.username, isNewUser };
  }

  async verifyPinAndIssueToken(
    userId: string,
    pin: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const valid = await this.usersService.verifyPin(userId, pin);
    if (!valid) throw new UnauthorizedException('Incorrect PIN');

    const accessToken = this.issueToken(user);
    return {
      accessToken,
      userId: user.id,
      username: user.username,
      isNewUser: false,
    };
  }

  validatePayload(payload: JwtPayload): Promise<User> {
    return this.usersService.findById(payload.sub);
  }

  private issueToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, username: user.username };
    return this.jwtService.sign(payload);
  }
}

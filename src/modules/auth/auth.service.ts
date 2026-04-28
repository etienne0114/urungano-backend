import {
  ConflictException,
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

  async signInAnonymous(username: string, pin?: string, isRegistration = false): Promise<AuthResponseDto> {
    let user: User;
    let isNewUser = false;

    const existing = await this.usersService.findByUsername(username);
    
    if (existing) {
      // If user exists, we check the PIN if provided
      if (pin) {
        const isValid = await this.usersService.verifyPin(existing.id, pin);
        if (!isValid) {
          throw new UnauthorizedException('Incorrect PIN for this username');
        }
      } else if (existing.pinHash) {
        // User has a PIN but none was provided in the request
        throw new UnauthorizedException('PIN required for this account');
      }
      
      user = existing;
      isNewUser = false;
    } else {
      // User doesn't exist
      if (!isRegistration) {
        // If not a registration request, throw 404 so frontend can confirm PIN
        throw new NotFoundException('User not found');
      }

      // Create new account
      user = await this.usersService.createAnonymous(username, pin);
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

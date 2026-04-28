import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AnonymousSignInDto, VerifyPinDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { SetPinDto } from '../users/dto/user.dto';
import type { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('anonymous')
  @Throttle({ auth: { limit: 5, ttl: 60000 } }) // 5 requests per minute for anonymous sign-in
  @ApiOperation({ summary: 'Create or sign in as anonymous user' })
  signInAnonymous(@Body() dto: AnonymousSignInDto) {
    return this.authService.signInAnonymous(dto.username, dto.pin, dto.isRegistration);
  }

  @Post('pin/set')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set or update PIN for the current user' })
  setPin(@CurrentUser() user: User, @Body() dto: SetPinDto) {
    return this.usersService.setPin(user.id, dto);
  }

  @Post('pin/verify/:userId')
  @Throttle({ auth: { limit: 3, ttl: 60000 } }) // 3 attempts per minute for PIN verification (more restrictive)
  @ApiOperation({ summary: 'Verify PIN and receive a new token' })
  verifyPin(@Param('userId') userId: string, @Body() dto: VerifyPinDto) {
    return this.authService.verifyPinAndIssueToken(userId, dto.pin);
  }

  @Post('pin/remove')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove PIN lock from the current user' })
  removePin(@CurrentUser() user: User) {
    return this.usersService.removePin(user.id);
  }
}

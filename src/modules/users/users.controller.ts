import { Body, Controller, Get, Patch, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: User) {
    return this.usersService.toResponseDto(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return this.usersService.toResponseDto(updated);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOneOrThrow({ where: { id: id as any } });
    return this.usersService.toResponseDto(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile by ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const updated = await this.usersService.updateProfile(id, dto);
    return this.usersService.toResponseDto(updated);
  }
}

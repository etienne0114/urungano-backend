import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Circle } from './entities/circle.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Debate } from './entities/debate.entity';
import { DebateVote } from './entities/debate-vote.entity';
import { AnonQuestion } from './entities/anon-question.entity';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Circle,
      ChatMessage,
      Debate,
      DebateVote,
      AnonQuestion,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '30d'),
        },
      }),
    }),
    UsersModule,
  ],
  providers: [CommunityService, ChatGateway],
  controllers: [CommunityController],
  exports: [CommunityService, ChatGateway],
})
export class CommunityModule {}

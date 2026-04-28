import {
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Circle } from './entities/circle.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Debate } from './entities/debate.entity';
import { DebateVote } from './entities/debate-vote.entity';
import { AnonQuestion } from './entities/anon-question.entity';
import { DirectMessage } from './entities/direct-message.entity';
import { UsersService } from '../users/users.service';
import type {
  SendMessageDto,
  CastVoteDto,
  SubmitQuestionDto,
  CircleResponseDto,
  MessageResponseDto,
  DebateResponseDto,
  AnonQuestionResponseDto,
  AnswerQuestionDto,
  SendDirectMessageDto,
  DirectMessageResponseDto,
} from './dto/community.dto';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Circle)
    private readonly circleRepo: Repository<Circle>,

    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,

    @InjectRepository(Debate)
    private readonly debateRepo: Repository<Debate>,

    @InjectRepository(DebateVote)
    private readonly voteRepo: Repository<DebateVote>,

    @InjectRepository(AnonQuestion)
    private readonly questionRepo: Repository<AnonQuestion>,

    @InjectRepository(DirectMessage)
    private readonly directMsgRepo: Repository<DirectMessage>,

    private readonly usersService: UsersService,
  ) {}

  // Inject ChatGateway after module initialization to avoid circular dependency
  private chatGateway: any;

  setChatGateway(chatGateway: any) {
    this.chatGateway = chatGateway;
  }

  // ── Circles ───────────────────────────────────────────────────────────────

  async getCircles(): Promise<CircleResponseDto[]> {
    const circles = await this.circleRepo.find({
      order: { createdAt: 'ASC' },
    });
    return Promise.all(circles.map((c) => this.circleToDto(c)));
  }

  private async circleToDto(circle: Circle): Promise<CircleResponseDto> {
    const messageCount = await this.messageRepo.count({
      where: { circle: { id: circle.id } },
    });

    // Get real-time online count from WebSocket gateway if available
    let onlineCount = 0;
    if (this.chatGateway) {
      try {
        onlineCount = await this.chatGateway.getCircleOnlineCount(circle.slug);
      } catch (error) {
        // Fallback to recent activity count if WebSocket is not available
        const windowStart = new Date(Date.now() - 30 * 60 * 1000);
        const recentActivity = await this.messageRepo
          .createQueryBuilder('m')
          .select('COUNT(DISTINCT m.user_id)', 'cnt')
          .where('m.circle_id = :cid', { cid: circle.id })
          .andWhere('m.created_at >= :since', { since: windowStart })
          .getRawOne<{ cnt: string }>();
        onlineCount = parseInt(recentActivity?.cnt ?? '0', 10);
      }
    }

    return {
      id:           circle.id,
      slug:         circle.slug,
      name:         circle.name,
      topic:        circle.topic,
      emoji:        circle.emoji,
      color:        circle.color,
      bgColor:      circle.bgColor,
      moderator:    circle.moderator,
      onlineCount,
      messageCount,
    };
  }

  // ── Chat messages ─────────────────────────────────────────────────────────

  async getMessages(
    circleSlug: string,
    currentUserId: string,
    limit = 50,
  ): Promise<MessageResponseDto[]> {
    const circle = await this.findCircleBySlug(circleSlug);
    const messages = await this.messageRepo.find({
      where: { circle: { id: circle.id } },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      take: limit,
    });
    return messages.map((m) => this.messageToDto(m, currentUserId));
  }

  async sendMessage(
    circleSlug: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const [circle, user] = await Promise.all([
      this.findCircleBySlug(circleSlug),
      this.usersService.findById(userId),
    ]);

    const message = this.messageRepo.create({
      circle,
      user,
      text:       dto.text.trim(),
      isEducator: false,
      lang:       dto.lang ?? 'rw',
    });

    const saved = await this.messageRepo.save(message);
    const full = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    
    const messageDto = this.messageToDto(full!, userId);

    // Broadcast message via WebSocket if gateway is available
    if (this.chatGateway) {
      try {
        await this.chatGateway.broadcastToCircle(circleSlug, 'newMessage', {
          circleSlug,
          message: messageDto,
          timestamp: new Date(),
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to broadcast message via WebSocket:', error);
      }
    }

    return messageDto;
  }

  private messageToDto(m: ChatMessage, currentUserId: string): MessageResponseDto {
    return {
      id:         m.id,
      who:        m.user.username,
      avatarSeed: m.user.avatarSeed,
      text:       m.text,
      isYou:      m.user.id === currentUserId,
      isEducator: m.isEducator,
      lang:       m.lang,
      createdAt:  m.createdAt,
    };
  }

  // ── Debates ───────────────────────────────────────────────────────────────

  async getDebates(currentUserId: string): Promise<DebateResponseDto[]> {
    const debates = await this.debateRepo.find({
      order: { createdAt: 'DESC' },
    });
    return Promise.all(debates.map((d) => this.debateToDto(d, currentUserId)));
  }

  async castVote(
    debateId: string,
    userId: string,
    dto: CastVoteDto,
  ): Promise<DebateResponseDto> {
    const debate = await this.debateRepo.findOne({ where: { id: debateId } });
    if (!debate) throw new NotFoundException('Debate not found');

    const existing = await this.voteRepo.findOne({
      where: { user: { id: userId }, debate: { id: debateId } },
    });
    if (existing) throw new ConflictException('Already voted on this debate');

    const user = await this.usersService.findById(userId);
    await this.voteRepo.save(
      this.voteRepo.create({ user, debate, vote: dto.vote }),
    );

    const updated = await this.debateToDto(debate, userId);

    // Broadcast vote update to all clients
    if (this.chatGateway) {
      this.chatGateway.server.emit('voteUpdate', {
        debateId,
        yesPercent: updated.yesPercent,
        noPercent: updated.noPercent,
        totalVotes: updated.totalVotes,
      });
    }

    return updated;
  }

  private async debateToDto(
    debate: Debate,
    currentUserId: string,
  ): Promise<DebateResponseDto> {
    const [yesVotes, noVotes, myVoteRecord] = await Promise.all([
      this.voteRepo.count({ where: { debate: { id: debate.id }, vote: true } }),
      this.voteRepo.count({ where: { debate: { id: debate.id }, vote: false } }),
      this.voteRepo.findOne({
        where: { debate: { id: debate.id }, user: { id: currentUserId } },
      }),
    ]);

    const total = yesVotes + noVotes;
    const yesPercent = total === 0 ? 50 : Math.round((yesVotes / total) * 100);

    return {
      id:          debate.id,
      question:    debate.question,
      tag:         debate.tag,
      heatColor:   debate.heatColor,
      yesPercent,
      noPercent:   100 - yesPercent,
      totalVotes:  total,
      myVote:      myVoteRecord ? myVoteRecord.vote : null,
    };
  }

  // ── Anonymous questions ───────────────────────────────────────────────────

  async getQuestions(): Promise<AnonQuestionResponseDto[]> {
    const questions = await this.questionRepo.find({
      order: { createdAt: 'DESC' },
    });
    return questions.map(this.questionToDto);
  }

  async submitQuestion(
    userId: string,
    dto: SubmitQuestionDto,
  ): Promise<AnonQuestionResponseDto> {
    const user = await this.usersService.findById(userId);
    const question = this.questionRepo.create({
      asker: user,
      text: dto.text.trim(),
      answered: false,
      reply: null,
    });
    const saved = await this.questionRepo.save(question);
    return this.questionToDto(saved);
  }

  // ── Anonymous questions (Educator) ────────────────────────────────────────

  async answerQuestion(
    questionId: string,
    educatorId: string,
    dto: AnswerQuestionDto,
  ): Promise<AnonQuestionResponseDto> {
    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Question not found');

    const educator = await this.usersService.findById(educatorId);
    
    question.answered = true;
    question.reply = dto.reply.trim();
    question.answeredBy = educator.username;
    
    const saved = await this.questionRepo.save(question);
    return this.questionToDto(saved);
  }

  // ── Direct messages ───────────────────────────────────────────────────────

  async getDirectMessages(
    userId: string,
    otherUserId: string,
  ): Promise<DirectMessageResponseDto[]> {
    const messages = await this.directMsgRepo.find({
      where: [
        { sender: { id: userId }, receiver: { id: otherUserId } },
        { sender: { id: otherUserId }, receiver: { id: userId } },
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
    });
    return messages.map(this.directMessageToDto);
  }

  async sendDirectMessage(
    senderId: string,
    dto: SendDirectMessageDto,
  ): Promise<DirectMessageResponseDto> {
    const [sender, receiver] = await Promise.all([
      this.usersService.findById(senderId),
      this.usersService.findById(dto.receiverId),
    ]);

    const dm = this.directMsgRepo.create({
      sender,
      receiver,
      text: dto.text.trim(),
      lang: dto.lang ?? 'rw',
    });

    const saved = await this.directMsgRepo.save(dm);
    
    const messageDto = this.directMessageToDto(saved);

    // Broadcast via WebSocket
    if (this.chatGateway) {
      await this.chatGateway.broadcastToUser(dto.receiverId, 'newDirectMessage', {
        message: messageDto,
      });
    }

    return messageDto;
  }

  private directMessageToDto(m: DirectMessage): DirectMessageResponseDto {
    return {
      id:           m.id,
      senderId:     m.sender.id,
      senderName:   m.sender.username,
      receiverId:   m.receiver.id,
      receiverName: m.receiver.username,
      text:         m.text,
      lang:         m.lang,
      isRead:       m.isRead,
      createdAt:    m.createdAt,
    };
  }

  // ── Featured ──────────────────────────────────────────────────────────────

  async getWeeklyCircle(): Promise<CircleResponseDto> {
    // Return a circle with 'weekly' tag or just the first one for now
    const circles = await this.circleRepo.find({ take: 1 });
    if (circles.length === 0) throw new NotFoundException('No circles available');
    return this.circleToDto(circles[0]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findCircleBySlug(slug: string): Promise<Circle> {
    const circle = await this.circleRepo.findOne({ where: { slug } });
    if (!circle) throw new NotFoundException(`Circle '${slug}' not found`);
    return circle;
  }

  private questionToDto(q: AnonQuestion): AnonQuestionResponseDto {
    return {
      id:          q.id,
      text:        q.text,
      answered:    q.answered,
      reply:       q.reply,
      answeredBy:  q.answeredBy,
      createdAt:   q.createdAt,
    };
  }
}

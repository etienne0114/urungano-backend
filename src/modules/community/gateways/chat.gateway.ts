import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CommunityService } from '../community.service';
import { UsersService } from '../../users/users.service';
import { SendMessageDto } from '../dto/community.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private readonly userPresence = new Map<string, { lastSeen: Date; circles: Set<string> }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly communityService: CommunityService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.usersService.findById(payload.sub);
      
      client.userId = user.id;
      client.username = user.username;

      // Track connected user
      if (!this.connectedUsers.has(user.id)) {
        this.connectedUsers.set(user.id, new Set());
      }
      this.connectedUsers.get(user.id)!.add(client.id);

      // Update presence
      this.userPresence.set(user.id, {
        lastSeen: new Date(),
        circles: new Set(),
      });

      this.logger.log(`User ${user.username} (${user.id}) connected with socket ${client.id}`);
      
      // Notify user of successful connection
      client.emit('connected', {
        userId: user.id,
        username: user.username,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Authentication failed for socket ${client.id}:`, error.message);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
          // Update last seen time
          const presence = this.userPresence.get(client.userId);
          if (presence) {
            presence.lastSeen = new Date();
          }
        }
      }

      this.logger.log(`User ${client.username} (${client.userId}) disconnected from socket ${client.id}`);
    }
  }

  @SubscribeMessage('joinCircle')
  async handleJoinCircle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleSlug: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Join the circle room
      await client.join(`circle:${data.circleSlug}`);
      
      // Update user presence
      const presence = this.userPresence.get(client.userId);
      if (presence) {
        presence.circles.add(data.circleSlug);
      }

      this.logger.log(`User ${client.username} joined circle: ${data.circleSlug}`);
      
      // Notify others in the circle
      client.to(`circle:${data.circleSlug}`).emit('userJoined', {
        userId: client.userId,
        username: client.username,
        circleSlug: data.circleSlug,
        timestamp: new Date(),
      });

      // Send confirmation to user
      client.emit('joinedCircle', {
        circleSlug: data.circleSlug,
        timestamp: new Date(),
      });

      // Send current online count and users list
      const onlineCount = await this.getCircleOnlineCount(data.circleSlug);
      const onlineUsers = await this.getCircleOnlineUsers(data.circleSlug);
      
      this.server.to(`circle:${data.circleSlug}`).emit('onlineCountUpdate', {
        circleSlug: data.circleSlug,
        onlineCount,
        onlineUsers, // Added
      });

    } catch (error) {
      this.logger.error(`Error joining circle ${data.circleSlug}:`, error.message);
      client.emit('error', { message: 'Failed to join circle' });
    }
  }

  @SubscribeMessage('leaveCircle')
  async handleLeaveCircle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleSlug: string },
  ) {
    if (!client.userId) {
      return;
    }

    try {
      // Leave the circle room
      await client.leave(`circle:${data.circleSlug}`);
      
      // Update user presence
      const presence = this.userPresence.get(client.userId);
      if (presence) {
        presence.circles.delete(data.circleSlug);
      }

      this.logger.log(`User ${client.username} left circle: ${data.circleSlug}`);
      
      // Notify others in the circle
      client.to(`circle:${data.circleSlug}`).emit('userLeft', {
        userId: client.userId,
        username: client.username,
        circleSlug: data.circleSlug,
        timestamp: new Date(),
      });

      // Send updated online count and users list
      const onlineCount = await this.getCircleOnlineCount(data.circleSlug);
      const onlineUsers = await this.getCircleOnlineUsers(data.circleSlug);

      this.server.to(`circle:${data.circleSlug}`).emit('onlineCountUpdate', {
        circleSlug: data.circleSlug,
        onlineCount,
        onlineUsers, // Added
      });

    } catch (error) {
      this.logger.error(`Error leaving circle ${data.circleSlug}:`, error.message);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleSlug: string; message: SendMessageDto },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Save message to database using the community service
      const savedMessage = await this.communityService.sendMessage(
        data.circleSlug,
        client.userId,
        data.message,
      );

      // Broadcast message to all users in the circle
      this.server.to(`circle:${data.circleSlug}`).emit('newMessage', {
        circleSlug: data.circleSlug,
        message: savedMessage,
        timestamp: new Date(),
      });

      this.logger.log(`Message sent by ${client.username} in circle ${data.circleSlug}`);

    } catch (error) {
      this.logger.error(`Error sending message in circle ${data.circleSlug}:`, error.message);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleSlug: string; isTyping: boolean },
  ) {
    if (!client.userId) {
      return;
    }

    // Broadcast typing indicator to others in the circle (not to sender)
    client.to(`circle:${data.circleSlug}`).emit('userTyping', {
      userId: client.userId,
      username: client.username,
      circleSlug: data.circleSlug,
      isTyping: data.isTyping,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { circleSlug: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const onlineCount = await this.getCircleOnlineCount(data.circleSlug);
      const onlineUsers = await this.getCircleOnlineUsers(data.circleSlug);

      client.emit('onlineUsers', {
        circleSlug: data.circleSlug,
        onlineCount,
        onlineUsers,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Error getting online users for circle ${data.circleSlug}:`, error.message);
      client.emit('error', { message: 'Failed to get online users' });
    }
  }

  // Helper methods

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from handshake auth
    const token = client.handshake.auth?.token || 
                  client.handshake.headers?.authorization?.replace('Bearer ', '') ||
                  client.handshake.query?.token;
    
    return typeof token === 'string' ? token : null;
  }

  private async getCircleOnlineCount(circleSlug: string): Promise<number> {
    const sockets = await this.server.in(`circle:${circleSlug}`).fetchSockets();
    const uniqueUsers = new Set();
    
    for (const socket of sockets) {
      const authSocket = socket as unknown as AuthenticatedSocket;
      if (authSocket.userId) {
        uniqueUsers.add(authSocket.userId);
      }
    }
    
    return uniqueUsers.size;
  }

  private async getCircleOnlineUsers(circleSlug: string): Promise<Array<{ userId: string; username: string; avatarSeed: string }>> {
    const sockets = await this.server.in(`circle:${circleSlug}`).fetchSockets();
    const uniqueUsers = new Map<string, { username: string; avatarSeed: string }>();
    
    for (const socket of sockets) {
      const authSocket = socket as unknown as AuthenticatedSocket;
      if (authSocket.userId && authSocket.username) {
        // Fetch full user to get avatarSeed if not on socket
        // Optimization: we could attach avatarSeed to socket during connection
        const user = await this.usersService.findById(authSocket.userId);
        uniqueUsers.set(authSocket.userId, { 
          username: authSocket.username,
          avatarSeed: user.avatarSeed 
        });
      }
    }
    
    return Array.from(uniqueUsers.entries()).map(([userId, data]) => ({
      userId,
      username: data.username,
      avatarSeed: data.avatarSeed,
    }));
  }

  // Public methods for external use

  public async broadcastToCircle(circleSlug: string, event: string, data: any) {
    this.server.to(`circle:${circleSlug}`).emit(event, data);
  }

  public async broadcastToUser(userId: string, event: string, data: any) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getUserPresence(userId: string): { lastSeen: Date; circles: string[] } | null {
    const presence = this.userPresence.get(userId);
    if (!presence) return null;
    
    return {
      lastSeen: presence.lastSeen,
      circles: Array.from(presence.circles),
    };
  }
}
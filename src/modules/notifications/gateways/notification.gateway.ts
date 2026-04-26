import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  createdAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
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

      this.logger.log(`User ${user.username} (${user.id}) connected to notifications with socket ${client.id}`);
      
      // Join user-specific room for targeted notifications
      await client.join(`user:${user.id}`);
      
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
        }
      }

      this.logger.log(`User ${client.username} (${client.userId}) disconnected from notifications socket ${client.id}`);
    }
  }

  @SubscribeMessage('subscribeToNotifications')
  async handleSubscribeToNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // User is already in their room from connection, just confirm subscription
    client.emit('subscribed', {
      userId: client.userId,
      timestamp: new Date(),
    });

    this.logger.log(`User ${client.username} subscribed to notifications`);
  }

  @SubscribeMessage('unsubscribeFromNotifications')
  async handleUnsubscribeFromNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return;
    }

    // Leave user room
    await client.leave(`user:${client.userId}`);
    
    client.emit('unsubscribed', {
      userId: client.userId,
      timestamp: new Date(),
    });

    this.logger.log(`User ${client.username} unsubscribed from notifications`);
  }

  @SubscribeMessage('markNotificationRead')
  async handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Emit acknowledgment back to the client
      client.emit('notificationMarkedRead', {
        notificationId: data.notificationId,
        userId: client.userId,
        timestamp: new Date(),
      });

      this.logger.log(`Notification ${data.notificationId} marked as read by user ${client.username}`);

    } catch (error) {
      this.logger.error(`Error marking notification as read:`, error.message);
      client.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  // Public methods for external use

  /**
   * Send a notification to a specific user
   */
  async sendNotificationToUser(userId: string, notification: NotificationPayload): Promise<void> {
    try {
      // Send to user's room
      this.server.to(`user:${userId}`).emit('newNotification', {
        notification,
        timestamp: new Date(),
      });

      this.logger.log(`Notification sent to user ${userId}: ${notification.title}`);

    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}:`, error.message);
    }
  }

  /**
   * Send a notification to multiple users
   */
  async sendNotificationToUsers(userIds: string[], notification: NotificationPayload): Promise<void> {
    const sendPromises = userIds.map(userId => this.sendNotificationToUser(userId, notification));
    await Promise.allSettled(sendPromises);
  }

  /**
   * Broadcast a notification to all connected users
   */
  async broadcastNotification(notification: NotificationPayload): Promise<void> {
    try {
      this.server.emit('broadcastNotification', {
        notification,
        timestamp: new Date(),
      });

      this.logger.log(`Broadcast notification sent: ${notification.title}`);

    } catch (error) {
      this.logger.error(`Failed to broadcast notification:`, error.message);
    }
  }

  /**
   * Send notification count update to a user
   */
  async sendUnreadCountUpdate(userId: string, unreadCount: number): Promise<void> {
    try {
      this.server.to(`user:${userId}`).emit('unreadCountUpdate', {
        unreadCount,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to send unread count update to user ${userId}:`, error.message);
    }
  }

  /**
   * Check if a user is currently connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get the number of connected users
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Helper methods

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from handshake auth
    const token = client.handshake.auth?.token || 
                  client.handshake.headers?.authorization?.replace('Bearer ', '') ||
                  client.handshake.query?.token;
    
    return typeof token === 'string' ? token : null;
  }
}
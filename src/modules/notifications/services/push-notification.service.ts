import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PushNotificationPayload {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

interface FCMMessage {
  to?: string;
  registration_ids?: string[];
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    sound?: string;
  };
  data?: Record<string, any>;
  priority: 'high' | 'normal';
  time_to_live?: number;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly fcmServerKey: string;
  private readonly fcmUrl = 'https://fcm.googleapis.com/fcm/send';
  
  // In-memory storage for device tokens (in production, use Redis or database)
  private readonly userDeviceTokens = new Map<string, Set<string>>();

  constructor(private readonly configService: ConfigService) {
    this.fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY', '');
    
    if (!this.fcmServerKey) {
      this.logger.warn('FCM_SERVER_KEY not configured. Push notifications will be logged only.');
    }
  }

  // ── Device Token Management ───────────────────────────────────────────────

  async registerDeviceToken(userId: string, token: string): Promise<void> {
    if (!this.userDeviceTokens.has(userId)) {
      this.userDeviceTokens.set(userId, new Set());
    }
    
    this.userDeviceTokens.get(userId)!.add(token);
    this.logger.log(`Registered device token for user ${userId}`);
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    const userTokens = this.userDeviceTokens.get(userId);
    if (userTokens) {
      userTokens.delete(token);
      if (userTokens.size === 0) {
        this.userDeviceTokens.delete(userId);
      }
    }
    
    this.logger.log(`Unregistered device token for user ${userId}`);
  }

  async getUserDeviceTokens(userId: string): Promise<string[]> {
    const tokens = this.userDeviceTokens.get(userId);
    return tokens ? Array.from(tokens) : [];
  }

  // ── Push Notification Sending ─────────────────────────────────────────────

  async sendPushNotification(payload: PushNotificationPayload): Promise<void> {
    const deviceTokens = await this.getUserDeviceTokens(payload.userId);
    
    if (deviceTokens.length === 0) {
      this.logger.warn(`No device tokens found for user ${payload.userId}`);
      return;
    }

    const fcmMessage: FCMMessage = {
      registration_ids: deviceTokens,
      notification: {
        title: payload.title,
        body: payload.message,
        icon: 'ic_notification',
        sound: 'default',
      },
      data: {
        ...payload.data,
        userId: payload.userId,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      time_to_live: 86400, // 24 hours
    };

    try {
      if (this.fcmServerKey) {
        await this.sendToFCM(fcmMessage);
      } else {
        // Log notification for development/testing
        this.logger.log(`[PUSH NOTIFICATION] ${payload.title}: ${payload.message}`, {
          userId: payload.userId,
          deviceTokens: deviceTokens.length,
          data: payload.data,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${payload.userId}:`, error);
      throw error;
    }
  }

  async sendBulkPushNotification(
    userIds: string[],
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const allTokens: string[] = [];
    
    for (const userId of userIds) {
      const tokens = await this.getUserDeviceTokens(userId);
      allTokens.push(...tokens);
    }

    if (allTokens.length === 0) {
      this.logger.warn('No device tokens found for bulk notification');
      return;
    }

    // FCM supports up to 1000 registration IDs per request
    const batches = this.chunkArray(allTokens, 1000);
    
    for (const batch of batches) {
      const fcmMessage: FCMMessage = {
        registration_ids: batch,
        notification: {
          title,
          body: message,
          icon: 'ic_notification',
          sound: 'default',
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        priority: 'high',
        time_to_live: 86400,
      };

      try {
        if (this.fcmServerKey) {
          await this.sendToFCM(fcmMessage);
        } else {
          this.logger.log(`[BULK PUSH NOTIFICATION] ${title}: ${message}`, {
            recipients: batch.length,
            data,
          });
        }
      } catch (error) {
        this.logger.error('Failed to send bulk push notification:', error);
      }
    }
  }

  // ── Topic-based Notifications ─────────────────────────────────────────────

  async sendTopicNotification(
    topic: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const fcmMessage = {
      to: `/topics/${topic}`,
      notification: {
        title,
        body: message,
        icon: 'ic_notification',
        sound: 'default',
      },
      data: {
        ...data,
        topic,
        timestamp: new Date().toISOString(),
      },
      priority: 'high' as const,
      time_to_live: 86400,
    };

    try {
      if (this.fcmServerKey) {
        await this.sendToFCM(fcmMessage);
      } else {
        this.logger.log(`[TOPIC NOTIFICATION] ${topic} - ${title}: ${message}`, { data });
      }
    } catch (error) {
      this.logger.error(`Failed to send topic notification to ${topic}:`, error);
      throw error;
    }
  }

  async subscribeToTopic(userId: string, topic: string): Promise<void> {
    const deviceTokens = await this.getUserDeviceTokens(userId);
    
    if (deviceTokens.length === 0) {
      this.logger.warn(`No device tokens found for user ${userId} to subscribe to topic ${topic}`);
      return;
    }

    // In a real implementation, you would call FCM's topic subscription API
    // For now, we'll just log the subscription
    this.logger.log(`User ${userId} subscribed to topic ${topic}`, {
      deviceTokens: deviceTokens.length,
    });
  }

  async unsubscribeFromTopic(userId: string, topic: string): Promise<void> {
    const deviceTokens = await this.getUserDeviceTokens(userId);
    
    if (deviceTokens.length === 0) {
      this.logger.warn(`No device tokens found for user ${userId} to unsubscribe from topic ${topic}`);
      return;
    }

    // In a real implementation, you would call FCM's topic unsubscription API
    this.logger.log(`User ${userId} unsubscribed from topic ${topic}`, {
      deviceTokens: deviceTokens.length,
    });
  }

  // ── Private Helper Methods ────────────────────────────────────────────────

  private async sendToFCM(message: FCMMessage): Promise<void> {
    const response = await fetch(this.fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `key=${this.fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FCM request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    if (result.failure > 0) {
      this.logger.warn('Some push notifications failed:', result);
      
      // Handle invalid tokens
      if (result.results) {
        for (let i = 0; i < result.results.length; i++) {
          const res = result.results[i];
          if (res.error === 'NotRegistered' || res.error === 'InvalidRegistration') {
            const invalidToken = message.registration_ids?.[i];
            if (invalidToken) {
              await this.removeInvalidToken(invalidToken);
            }
          }
        }
      }
    }

    this.logger.log(`FCM notification sent successfully: ${result.success} success, ${result.failure} failures`);
  }

  private async removeInvalidToken(token: string): Promise<void> {
    // Remove invalid token from all users
    for (const [userId, tokens] of this.userDeviceTokens.entries()) {
      if (tokens.has(token)) {
        tokens.delete(token);
        if (tokens.size === 0) {
          this.userDeviceTokens.delete(userId);
        }
        this.logger.log(`Removed invalid token for user ${userId}`);
        break;
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ── Statistics and Monitoring ─────────────────────────────────────────────

  getRegisteredUsersCount(): number {
    return this.userDeviceTokens.size;
  }

  getTotalDeviceTokensCount(): number {
    let total = 0;
    for (const tokens of this.userDeviceTokens.values()) {
      total += tokens.size;
    }
    return total;
  }

  getUsersWithMultipleDevices(): Array<{ userId: string; deviceCount: number }> {
    const result: Array<{ userId: string; deviceCount: number }> = [];
    
    for (const [userId, tokens] of this.userDeviceTokens.entries()) {
      if (tokens.size > 1) {
        result.push({ userId, deviceCount: tokens.size });
      }
    }
    
    return result;
  }
}
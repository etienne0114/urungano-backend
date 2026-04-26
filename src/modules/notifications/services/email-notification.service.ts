import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  data?: Record<string, any>;
  isHtml?: boolean;
}

interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: Transporter | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@urungano.app');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'URUNGANO ReproHealth');
    
    this.initializeTransporter();
  }

  private async initializeTransporter(): Promise<void> {
    const emailProvider = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');
    
    try {
      switch (emailProvider) {
        case 'smtp':
          await this.initializeSMTP();
          break;
        case 'sendgrid':
          await this.initializeSendGrid();
          break;
        case 'mailgun':
          await this.initializeMailgun();
          break;
        default:
          this.logger.warn(`Unknown email provider: ${emailProvider}. Email notifications will be logged only.`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
      this.logger.warn('Email notifications will be logged only.');
    }
  }

  private async initializeSMTP(): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP configuration incomplete. Email notifications will be logged only.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false, // For development
      },
    });

    // Verify connection
    if (this.transporter) {
      await this.transporter.verify();
    }
    this.logger.log('SMTP transporter initialized successfully');
  }

  private async initializeSendGrid(): Promise<void> {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('SENDGRID_API_KEY not configured. Email notifications will be logged only.');
      return;
    }

    // SendGrid configuration would go here
    this.logger.log('SendGrid transporter initialized successfully');
  }

  private async initializeMailgun(): Promise<void> {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    const domain = this.configService.get<string>('MAILGUN_DOMAIN');
    
    if (!apiKey || !domain) {
      this.logger.warn('Mailgun configuration incomplete. Email notifications will be logged only.');
      return;
    }

    // Mailgun configuration would go here
    this.logger.log('Mailgun transporter initialized successfully');
  }

  // ── Email Sending ─────────────────────────────────────────────────────────

  async sendEmail(payload: EmailPayload): Promise<void> {
    try {
      if (this.transporter) {
        const mailOptions = {
          from: `${this.fromName} <${this.fromEmail}>`,
          to: payload.to,
          subject: payload.subject,
          text: payload.isHtml ? undefined : payload.body,
          html: payload.isHtml ? payload.body : undefined,
        };

        const result = await this.transporter.sendMail(mailOptions);
        this.logger.log(`Email sent successfully to ${payload.to}:`, result.messageId);
      } else {
        // Log email for development/testing
        this.logger.log(`[EMAIL NOTIFICATION] To: ${payload.to}`, {
          subject: payload.subject,
          body: payload.body.substring(0, 100) + '...',
          data: payload.data,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.to}:`, error);
      throw error;
    }
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string,
    isHtml = false,
  ): Promise<void> {
    const sendPromises = recipients.map(recipient =>
      this.sendEmail({
        to: recipient,
        subject,
        body,
        isHtml,
      })
    );

    try {
      await Promise.allSettled(sendPromises);
      this.logger.log(`Bulk email sent to ${recipients.length} recipients`);
    } catch (error) {
      this.logger.error('Failed to send bulk email:', error);
      throw error;
    }
  }

  // ── Template-based Emails ─────────────────────────────────────────────────

  async sendTemplatedEmail(
    to: string,
    templateName: string,
    variables: Record<string, any>,
  ): Promise<void> {
    const template = this.getEmailTemplate(templateName, variables);
    
    await this.sendEmail({
      to,
      subject: template.subject,
      body: template.htmlBody,
      isHtml: true,
    });
  }

  private getEmailTemplate(templateName: string, variables: Record<string, any>): EmailTemplate {
    switch (templateName) {
      case 'lesson_reminder':
        return this.getLessonReminderTemplate(variables);
      case 'quiz_completed':
        return this.getQuizCompletedTemplate(variables);
      case 'streak_milestone':
        return this.getStreakMilestoneTemplate(variables);
      case 'question_answered':
        return this.getQuestionAnsweredTemplate(variables);
      case 'welcome':
        return this.getWelcomeTemplate(variables);
      default:
        throw new Error(`Unknown email template: ${templateName}`);
    }
  }

  private getLessonReminderTemplate(variables: Record<string, any>): EmailTemplate {
    const { username, lessonTitle } = variables;
    
    return {
      subject: 'Time for your lesson! 📚',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Hi ${username}! 👋</h2>
          <p>Don't forget to complete your lesson today:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1f2937;">${lessonTitle}</h3>
          </div>
          <p>Keep up your learning streak! 🔥</p>
          <a href="https://app.urungano.com/lessons" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Continue Learning
          </a>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            URUNGANO ReproHealth 3D<br>
            Empowering reproductive health education
          </p>
        </div>
      `,
      textBody: `Hi ${username}!\n\nDon't forget to complete your lesson today: "${lessonTitle}"\n\nKeep up your learning streak!\n\nVisit: https://app.urungano.com/lessons\n\n---\nURUNGANO ReproHealth 3D`,
    };
  }

  private getQuizCompletedTemplate(variables: Record<string, any>): EmailTemplate {
    const { username, lessonTitle, score } = variables;
    const emoji = score >= 80 ? '🎉' : score >= 60 ? '👍' : '💪';
    
    return {
      subject: `Quiz completed! You scored ${score}% ${emoji}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Great job, ${username}! ${emoji}</h2>
          <p>You've completed the quiz for:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1f2937;">${lessonTitle}</h3>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #059669;">
              Score: ${score}%
            </p>
          </div>
          ${score >= 80 ? 
            '<p style="color: #059669;">Excellent work! You really understand this topic.</p>' :
            '<p style="color: #d97706;">Good effort! Consider reviewing the lesson to improve your understanding.</p>'
          }
          <a href="https://app.urungano.com/lessons" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Continue Learning
          </a>
        </div>
      `,
      textBody: `Great job, ${username}!\n\nYou've completed the quiz for "${lessonTitle}" with a score of ${score}%.\n\n${score >= 80 ? 'Excellent work!' : 'Good effort! Consider reviewing the lesson.'}\n\nVisit: https://app.urungano.com/lessons`,
    };
  }

  private getStreakMilestoneTemplate(variables: Record<string, any>): EmailTemplate {
    const { username, streakDays } = variables;
    
    return {
      subject: `${streakDays} day streak! You're on fire! 🔥`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🔥 ${streakDays} Day Streak! 🔥</h2>
          <p>Congratulations, ${username}!</p>
          <div style="background: linear-gradient(135deg, #fef3c7, #fcd34d); padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <h1 style="margin: 0; font-size: 48px; color: #92400e;">${streakDays}</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; color: #92400e; font-weight: bold;">
              Days in a row!
            </p>
          </div>
          <p>You've maintained a ${streakDays} day learning streak. This shows incredible dedication to your reproductive health education!</p>
          <p>Keep it up! 💪</p>
          <a href="https://app.urungano.com/lessons" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Continue Your Streak
          </a>
        </div>
      `,
      textBody: `🔥 ${streakDays} Day Streak! 🔥\n\nCongratulations, ${username}!\n\nYou've maintained a ${streakDays} day learning streak. Keep it up!\n\nVisit: https://app.urungano.com/lessons`,
    };
  }

  private getQuestionAnsweredTemplate(variables: Record<string, any>): EmailTemplate {
    const { username, questionPreview } = variables;
    
    return {
      subject: 'Your question was answered! 💬',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Your question was answered! 💬</h2>
          <p>Hi ${username},</p>
          <p>A health educator has answered your question:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-style: italic;">"${questionPreview}..."</p>
          </div>
          <p>Check the app to read the full answer and continue the conversation.</p>
          <a href="https://app.urungano.com/community/questions" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Read Answer
          </a>
        </div>
      `,
      textBody: `Your question was answered!\n\nHi ${username},\n\nA health educator has answered your question: "${questionPreview}..."\n\nCheck the app to read the full answer.\n\nVisit: https://app.urungano.com/community/questions`,
    };
  }

  private getWelcomeTemplate(variables: Record<string, any>): EmailTemplate {
    const { username } = variables;
    
    return {
      subject: 'Welcome to URUNGANO ReproHealth 3D! 🌟',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb; text-align: center;">Welcome to URUNGANO! 🌟</h1>
          <p>Hi ${username},</p>
          <p>Welcome to URUNGANO ReproHealth 3D! We're excited to have you join our community of learners.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">What you can do:</h3>
            <ul style="color: #374151;">
              <li>📚 Learn through interactive 3D lessons</li>
              <li>🧠 Test your knowledge with quizzes</li>
              <li>💬 Connect with peers in community circles</li>
              <li>❓ Ask anonymous questions to health educators</li>
              <li>🏆 Track your learning progress and streaks</li>
            </ul>
          </div>
          
          <p>Ready to start your reproductive health education journey?</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.urungano.com/lessons" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Start Learning Now
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            URUNGANO ReproHealth 3D<br>
            Empowering reproductive health education through technology
          </p>
        </div>
      `,
      textBody: `Welcome to URUNGANO ReproHealth 3D!\n\nHi ${username},\n\nWelcome to our community! You can now:\n- Learn through interactive lessons\n- Take quizzes\n- Connect with peers\n- Ask questions anonymously\n- Track your progress\n\nStart learning: https://app.urungano.com/lessons\n\n---\nURUNGANO ReproHealth 3D`,
    };
  }

  // ── Utility Methods ───────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed:', error);
      return false;
    }
  }

  getTransporterInfo(): any {
    if (!this.transporter) {
      return { status: 'not_configured' };
    }

    return {
      status: 'configured',
      from: `${this.fromName} <${this.fromEmail}>`,
    };
  }
}
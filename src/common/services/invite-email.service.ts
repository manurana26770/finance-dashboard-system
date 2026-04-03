import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class InviteEmailService {
  private readonly logger = new Logger(InviteEmailService.name);

  async sendInviteEmail(email: string, name: string, inviteLink: string): Promise<void> {
    const config = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
    const from = process.env.MAIL_FROM || config.user;

    if (!config.host || !config.user || !config.pass || !from) {
      this.logger.warn(
        `SMTP is not configured. Skipping invite email for ${email}. Link: ${inviteLink}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const message = [
      `Hello ${name},`,
      '',
      'You have been invited to the Finance Dashboard.',
      'Use the link below to complete your registration:',
      inviteLink,
      '',
      'If you did not expect this invitation, you can ignore this email.',
    ].join('\n');

    await transporter.sendMail({
      from,
      to: email,
      subject: 'You are invited to Finance Dashboard',
      text: message,
    });
  }
}
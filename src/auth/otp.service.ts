import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private config: ConfigService) {}

  // Generate a 6-digit OTP
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via Termii (Nigeria SMS)
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const apiKey = this.config.get<string>('TERMII_API_KEY');
    const senderId = this.config.get<string>('TERMII_SENDER_ID', 'Eutaw');

    // Normalize phone to international format
    const normalizedPhone = this.normalizePhone(phone);

    const message = `Your Eutaw Connect verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

    try {
      const response = await axios.post('https://v3.api.termii.com/api/sms/send', {
        to: normalizedPhone,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: apiKey,
      });

      this.logger.log(`OTP sent to ${normalizedPhone}: ${response.data.message_id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${normalizedPhone}`, error.message);
      return false;
    }
  }

  // Normalize Nigerian phone numbers to +234 format
  private normalizePhone(phone: string): string {
    // Remove spaces and dashes
    phone = phone.replace(/[\s-]/g, '');

    // Convert 0803... to 2348103... (Termii needs no + prefix)
    if (phone.startsWith('0')) {
      return '234' + phone.slice(1);
    }

    // Strip + if present
    if (phone.startsWith('+234')) {
      return phone.slice(1);
    }

    if (phone.startsWith('234')) {
      return phone;
    }

    return phone;
  }
}

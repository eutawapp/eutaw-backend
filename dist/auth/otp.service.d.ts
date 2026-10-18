import { ConfigService } from '@nestjs/config';
export declare class OtpService {
    private config;
    private readonly logger;
    constructor(config: ConfigService);
    generateOtp(): string;
    sendOtp(phone: string, otp: string): Promise<boolean>;
    private normalizePhone;
}

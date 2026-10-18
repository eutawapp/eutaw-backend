"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let OtpService = OtpService_1 = class OtpService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(OtpService_1.name);
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async sendOtp(phone, otp) {
        const apiKey = this.config.get('TERMII_API_KEY');
        const senderId = this.config.get('TERMII_SENDER_ID', 'Eutaw');
        const normalizedPhone = this.normalizePhone(phone);
        const message = `Your Eutaw Connect verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
        try {
            const response = await axios_1.default.post('https://api.ng.termii.com/api/sms/send', {
                to: normalizedPhone,
                from: senderId,
                sms: message,
                type: 'plain',
                channel: 'generic',
                api_key: apiKey,
            });
            this.logger.log(`OTP sent to ${normalizedPhone}: ${response.data.message_id}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send OTP to ${normalizedPhone}`, error.message);
            return false;
        }
    }
    normalizePhone(phone) {
        phone = phone.replace(/[\s-]/g, '');
        if (phone.startsWith('0')) {
            return '+234' + phone.slice(1);
        }
        if (phone.startsWith('+234')) {
            return phone;
        }
        if (phone.startsWith('234')) {
            return '+' + phone;
        }
        return phone;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OtpService);
//# sourceMappingURL=otp.service.js.map
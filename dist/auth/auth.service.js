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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const supabase_service_1 = require("../common/supabase/supabase.service");
const otp_service_1 = require("./otp.service");
const bcrypt = require("bcrypt");
const resend_1 = require("resend");
let AuthService = AuthService_1 = class AuthService {
    constructor(supabase, jwt, config, otpService) {
        this.supabase = supabase;
        this.jwt = jwt;
        this.config = config;
        this.otpService = otpService;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.resend = new resend_1.Resend(this.config.get('RESEND_API_KEY'));
    }
    async sendEmailOtp(dto) {
        const { email, purpose } = dto;
        const otp = this.otpService.generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const otpHash = await bcrypt.hash(otp, 8);
        const { error } = await this.supabase.admin
            .from('otp_logs')
            .insert({
            email,
            otp_hash: otpHash,
            purpose,
            expires_at: expiresAt.toISOString(),
            attempts: 0,
        });
        if (error) {
            this.logger.error('Failed to save OTP log', error);
            throw new common_1.BadRequestException('Failed to send OTP');
        }
        const sent = await this.sendOtpEmail(email, otp, purpose);
        if (!sent)
            throw new common_1.BadRequestException('Failed to send OTP email.');
        const isDev = this.config.get('NODE_ENV') !== 'production';
        return {
            message: 'OTP sent to your email',
            expires_in: 600,
            ...(isDev && { otp }),
        };
    }
    async verifyEmailOtp(dto) {
        const { email, otp, purpose } = dto;
        const { data: otpLog, error } = await this.supabase.admin
            .from('otp_logs')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('purpose', purpose)
            .is('verified_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();
        if (error || !otpLog) {
            throw new common_1.BadRequestException('OTP expired or not found. Please request a new one.');
        }
        if (otpLog.attempts >= 5) {
            throw new common_1.BadRequestException('Too many failed attempts. Please request a new OTP.');
        }
        const isValid = await bcrypt.compare(otp, otpLog.otp_hash);
        if (!isValid) {
            await this.supabase.admin
                .from('otp_logs')
                .update({ attempts: otpLog.attempts + 1 })
                .eq('id', otpLog.id);
            throw new common_1.BadRequestException('Invalid OTP. Please try again.');
        }
        await this.supabase.admin
            .from('otp_logs')
            .update({ verified_at: new Date().toISOString() })
            .eq('id', otpLog.id);
        const { data: user } = await this.supabase.admin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();
        if (user) {
            return { is_new_user: false, ...this.generateTokens(user) };
        }
        const tempToken = this.jwt.sign({ email: email.toLowerCase(), verified: true, purpose: 'registration' }, { expiresIn: '30m' });
        return {
            is_new_user: true,
            temp_token: tempToken,
            message: 'Email verified. Complete your profile to continue.',
        };
    }
    async registerPatient(dto, tempToken) {
        let payload;
        try {
            payload = this.jwt.verify(tempToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired registration token.');
        }
        if (payload.purpose !== 'registration') {
            throw new common_1.UnauthorizedException('Invalid token purpose.');
        }
        const email = payload.email;
        const { data: existing } = await this.supabase.admin
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        if (existing)
            throw new common_1.ConflictException('Email already registered.');
        const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
            email: lEmail, password, email_confirm: true,
            user_metadata: { full_name, role: 'patient' },
        });
        if (authError)
            throw new common_1.BadRequestException('Failed to create account.');
        const { data: user, error: profileError } = await this.supabase.admin
            .from('users')
            .insert({
            id: authData.user.id,
            full_name: dto.full_name || 'Patient',
            email,
            phone: dto.phone || null,
            role: 'patient',
            gender: dto.gender || null,
            date_of_birth: dto.date_of_birth || null,
            is_verified: true,
            onboarding_done: !!(dto.full_name && dto.full_name !== 'Patient'),
        })
            .select()
            .single();
        if (profileError)
            throw new common_1.BadRequestException('Failed to create profile.');
        await this.supabase.admin.from('patient_profiles').insert({ user_id: user.id });
        return this.generateTokens(user);
    }
    async sendOtp(dto) {
        const { phone, purpose } = dto;
        const otp = this.otpService.generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const otpHash = await bcrypt.hash(otp, 8);
        const { error } = await this.supabase.admin
            .from('otp_logs')
            .insert({ phone, otp_hash: otpHash, purpose, expires_at: expiresAt.toISOString(), attempts: 0 });
        if (error)
            throw new common_1.BadRequestException('Failed to send OTP');
        const sent = await this.otpService.sendOtp(phone, otp);
        if (!sent)
            throw new common_1.BadRequestException('Failed to send SMS. Please try again.');
        const isDev = this.config.get('NODE_ENV') !== 'production';
        return { message: 'OTP sent successfully', expires_in: 600, ...(isDev && { otp }) };
    }
    async verifyOtp(dto) {
        const { phone, otp, purpose } = dto;
        const { data: otpLog, error } = await this.supabase.admin
            .from('otp_logs')
            .select('*')
            .eq('phone', phone)
            .eq('purpose', purpose)
            .is('verified_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();
        if (error || !otpLog)
            throw new common_1.BadRequestException('OTP expired or not found.');
        if (otpLog.attempts >= 5)
            throw new common_1.BadRequestException('Too many failed attempts.');
        const isValid = await bcrypt.compare(otp, otpLog.otp_hash);
        if (!isValid) {
            await this.supabase.admin.from('otp_logs')
                .update({ attempts: otpLog.attempts + 1 }).eq('id', otpLog.id);
            throw new common_1.BadRequestException('Invalid OTP.');
        }
        await this.supabase.admin.from('otp_logs')
            .update({ verified_at: new Date().toISOString() }).eq('id', otpLog.id);
        const { data: user } = await this.supabase.admin
            .from('users').select('*').eq('phone', phone).single();
        if (user)
            return { is_new_user: false, ...this.generateTokens(user) };
        const tempToken = this.jwt.sign({ phone, verified: true, purpose: 'registration' }, { expiresIn: '30m' });
        return { is_new_user: true, temp_token: tempToken, message: 'Phone verified. Complete registration.' };
    }
    async register(dto, tempToken) {
        let payload;
        try {
            payload = this.jwt.verify(tempToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired registration token.');
        }
        if (payload.purpose !== 'registration')
            throw new common_1.UnauthorizedException('Invalid token purpose.');
        const phone = payload.phone;
        const { data: existing } = await this.supabase.admin.from('users').select('id').eq('phone', phone).single();
        if (existing)
            throw new common_1.ConflictException('Phone number already registered.');
        const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
            phone, phone_confirm: true, email: dto.email,
            password: Math.random().toString(36).slice(-12),
            user_metadata: { full_name: dto.full_name, role: dto.role },
        });
        if (authError)
            throw new common_1.BadRequestException('Failed to create account.');
        const { data: user, error: profileError } = await this.supabase.admin.from('users').insert({
            id: authData.user.id, full_name: dto.full_name, phone,
            email: dto.email, role: dto.role, state: dto.state,
            gender: dto.gender, date_of_birth: dto.date_of_birth,
        }).select().single();
        if (profileError)
            throw new common_1.BadRequestException('Failed to create profile.');
        if (dto.role === 'patient') {
            await this.supabase.admin.from('patient_profiles').insert({ user_id: user.id });
        }
        return this.generateTokens(user);
    }
    async loginEmail(dto) {
        const { email, password } = dto;
        const { data: user, error } = await this.supabase.admin.from('users')
            .select('*').eq('email', email.toLowerCase()).single();
        if (error || !user)
            throw new common_1.UnauthorizedException('Invalid email or password.');
        if (user.role === 'patient')
            throw new common_1.UnauthorizedException('Use the Eutaw patient app to log in.');
        if (!user.is_active)
            throw new common_1.UnauthorizedException('Account suspended. Contact support.');
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid email or password.');
        return this.generateTokens(user);
    }
    async registerEmail(dto) {
        const { email, password, full_name, role, phone, specialty, license_number } = dto;
        if (role === 'patient')
            throw new common_1.BadRequestException('Use the patient app to register.');
        const { data: existing } = await this.supabase.admin.from('users')
            .select('id').eq('email', email.toLowerCase()).single();
        if (existing)
            throw new common_1.ConflictException('Email address already registered.');
        const password_hash = await bcrypt.hash(password, 12);
        const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
            email: email.toLowerCase(), password, email_confirm: true,
            phone: phone || undefined, user_metadata: { full_name, role },
        });
        if (authError)
            throw new common_1.BadRequestException('Failed to create account. ' + authError.message);
        const { data: user, error: profileError } = await this.supabase.admin.from('users').insert({
            id: authData.user.id, full_name, email: email.toLowerCase(),
            phone: phone || null, role, password_hash, is_verified: false,
        }).select().single();
        if (profileError)
            throw new common_1.BadRequestException('Failed to create profile.');
        if (['doctor', 'pharmacist', 'lab_tech'].includes(role)) {
            await this.supabase.admin.from('practitioner_profiles').insert({
                user_id: user.id, specialty: specialty || null,
                license_number: license_number || null, verification_status: 'pending',
            });
        }
        return this.generateTokens(user);
    }
    async patientSignUp(dto) {
        const { email, password, full_name, phone } = dto;
        const lEmail = email.toLowerCase().trim();
        const { data: existing } = await this.supabase.admin
            .from('users').select('id').eq('email', lEmail).single();
        if (existing)
            throw new common_1.ConflictException('Email address already registered.');
        const password_hash = await bcrypt.hash(password, 12);
        const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
            email: lEmail, password, email_confirm: true,
            phone: phone || undefined,
            user_metadata: { full_name, role: 'patient' },
        });
        if (authError)
            throw new common_1.BadRequestException('Failed to create account. ' + authError.message);
        const { data: user, error: profileError } = await this.supabase.admin
            .from('users').insert({
            id: authData.user.id,
            full_name,
            email: lEmail,
            phone: phone || null,
            role: 'patient',
            password_hash,
            is_verified: true,
            onboarding_done: false,
        }).select().single();
        if (profileError)
            throw new common_1.BadRequestException('Failed to create profile: ' + profileError.message);
        return this.generateTokens(user);
    }
    async patientSignIn(dto) {
        const { email, password } = dto;
        const lEmail = email.toLowerCase().trim();
        const { data: user, error } = await this.supabase.admin
            .from('users').select('*').eq('email', lEmail).single();
        if (error || !user)
            throw new common_1.UnauthorizedException('Invalid email or password.');
        if (user.role !== 'patient')
            throw new common_1.UnauthorizedException('Use the professional portal to sign in.');
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid email or password.');
        return this.generateTokens(user);
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwt.verify(refreshToken, {
                secret: this.config.get('JWT_SECRET') + '_refresh',
            });
            const { data: user } = await this.supabase.admin.from('users')
                .select('*').eq('id', payload.sub).single();
            if (!user || !user.is_active)
                throw new common_1.UnauthorizedException('Account not found or suspended.');
            return this.generateTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token.');
        }
    }
    generateTokens(user) {
        const payload = { sub: user.id, email: user.email, phone: user.phone, role: user.role };
        const accessToken = this.jwt.sign(payload, { expiresIn: this.config.get('JWT_EXPIRES_IN', '15m') });
        const refreshToken = this.jwt.sign(payload, {
            expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
            secret: this.config.get('JWT_SECRET') + '_refresh',
        });
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user.id, full_name: user.full_name, phone: user.phone,
                email: user.email, role: user.role, is_verified: user.is_verified,
                onboarding_done: user.onboarding_done,
            },
        };
    }
    async sendOtpEmail(email, otp, purpose) {
        const action = purpose === 'signup' ? 'create your account' : 'sign in';
        try {
            await this.resend.emails.send({
                from: this.config.get('RESEND_FROM_EMAIL', 'Eutaw Connect <noreply@eutaw.app>'),
                to: email,
                subject: `Your Eutaw Connect verification code: ${otp}`,
                html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
            <div style="text-align:center;margin-bottom:32px;">
              <div style="display:inline-block;background:#10b981;padding:12px 20px;border-radius:12px;">
                <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:2px;">EUTAW</span>
                <span style="color:rgba(255,255,255,.7);font-size:10px;font-weight:700;letter-spacing:3px;display:block;">CONNECT</span>
              </div>
            </div>
            <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 8px;">Your verification code</h1>
            <p style="color:#64748b;margin:0 0 32px;">Use this code to ${action} on Eutaw Connect.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:28px;text-align:center;margin-bottom:32px;">
              <span style="font-size:48px;font-weight:900;letter-spacing:12px;color:#10b981;font-family:monospace;">${otp}</span>
              <p style="color:#94a3b8;font-size:13px;margin:12px 0 0;">Valid for 10 minutes</p>
            </div>
            <p style="color:#94a3b8;font-size:13px;">If you did not request this code, you can safely ignore this email.</p>
          </div>
        `,
            });
            return true;
        }
        catch (err) {
            this.logger.error('Resend email failed', err.message);
            return false;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        jwt_1.JwtService,
        config_1.ConfigService,
        otp_service_1.OtpService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
    private config: ConfigService,
    private otpService: OtpService,
  ) {}

  // ── Step 1: Send OTP to phone ─────────────────────────────
  async sendOtp(dto: SendOtpDto) {
    const { phone, purpose } = dto;
    const otp = this.otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    const { error } = await this.supabase.admin
      .from('otp_logs')
      .insert({
        phone,
        otp,
        purpose,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      this.logger.error('Failed to save OTP log', error);
      throw new BadRequestException('Failed to send OTP');
    }

    // Try to send SMS via Termii (non-blocking — don't fail if SMS fails)
    this.otpService.sendOtp(phone, otp).catch(e =>
      this.logger.error('Termii SMS failed (non-fatal)', e.message)
    );

    // Always return success — OTP is in DB, SMS is best-effort
    // In development, return OTP in response for testing
    const isDev = this.config.get('NODE_ENV') !== 'production';
    return {
      message: 'OTP sent successfully',
      expires_in: 600,
      ...(isDev && { otp }), // Only in dev mode — shows OTP in response
    };
  }

  // ── Step 2: Verify OTP ────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const { phone, otp, purpose } = dto;

    // Find most recent valid OTP for this phone
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

    if (error || !otpLog) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    if (otpLog.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    // Compare the submitted OTP against what was saved in the database
    const isValid = otpLog.otp === otp;

    if (!isValid) {
      // Increment attempts
      await this.supabase.admin
        .from('otp_logs')
        .update({ attempts: otpLog.attempts + 1 })
        .eq('id', otpLog.id);

      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    // Mark OTP as verified
    await this.supabase.admin
      .from('otp_logs')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpLog.id);

    // Check if user exists
    const { data: user } = await this.supabase.admin
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (user) {
      // Existing user — return tokens
      return this.generateTokens(user);
    }

    // New user — return a temp token to complete registration
    const tempToken = this.jwt.sign(
      { phone, verified: true, purpose: 'registration' },
      { expiresIn: '30m' },
    );

    return {
      is_new_user: true,
      temp_token: tempToken,
      message: 'Phone verified. Please complete registration.',
    };
  }

  // ── Step 3: Register new user ─────────────────────────────
  async register(dto: RegisterDto, tempToken: string) {
    // Verify the temp token
    let payload: any;
    try {
      payload = this.jwt.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired registration token.');
    }

    if (payload.purpose !== 'registration') {
      throw new UnauthorizedException('Invalid token purpose.');
    }

    const phone = payload.phone;

    // Check phone not already registered
    const { data: existing } = await this.supabase.admin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existing) {
      throw new ConflictException('Phone number already registered.');
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email: dto.email,
      password: Math.random().toString(36).slice(-12), // Random password (OTP-only login)
      user_metadata: { full_name: dto.full_name, role: dto.role },
    });

    if (authError) {
      this.logger.error('Failed to create auth user', authError);
      throw new BadRequestException('Failed to create account.');
    }

    // Create public user profile
    const { data: user, error: profileError } = await this.supabase.admin
      .from('users')
      .insert({
        id: authData.user.id,
        full_name: dto.full_name,
        phone,
        email: dto.email,
        role: dto.role,
        state: dto.state,
        gender: dto.gender,
        date_of_birth: dto.date_of_birth,
      })
      .select()
      .single();

    if (profileError) {
      this.logger.error('Failed to create user profile', profileError);
      throw new BadRequestException('Failed to create profile.');
    }

    // If patient, create patient profile
    if (dto.role === 'patient') {
      await this.supabase.admin
        .from('patient_profiles')
        .insert({ user_id: user.id });
    }

    // Log registration
    await this.logAudit({
      actor_id: user.id,
      actor_role: dto.role,
      action: 'user.registered',
      resource_type: 'user',
      resource_id: user.id,
    });

    return this.generateTokens(user);
  }

  // ── Generate JWT access + refresh tokens ──────────────────
  private generateTokens(user: any) {
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      secret: this.config.get('JWT_SECRET') + '_refresh',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        onboarding_done: user.onboarding_done,
      },
    };
  }

  // ── Refresh access token ──────────────────────────────────
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_SECRET') + '_refresh',
      });

      const { data: user } = await this.supabase.admin
        .from('users')
        .select('*')
        .eq('id', payload.sub)
        .single();

      if (!user || !user.is_active) {
        throw new UnauthorizedException('Account not found or suspended.');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  // ── Write to audit log ────────────────────────────────────
  private async logAudit(data: {
    actor_id: string;
    actor_role: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    patient_id?: string;
  }) {
    await this.supabase.admin.from('audit_logs').insert({
      ...data,
      entry_hash: '', // TODO: implement SHA-256 hash chain
    });
  }
}

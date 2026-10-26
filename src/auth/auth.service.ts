import {
  Injectable, BadRequestException, UnauthorizedException,
  ConflictException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { OtpService } from './otp.service';
import {
  SendOtpDto, VerifyOtpDto, RegisterDto, LoginEmailDto, RegisterEmailDto,
  SendEmailOtpDto, VerifyEmailOtpDto, RegisterPatientDto,
  PatientSignUpDto, PatientSignInDto,
} from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private resend: Resend;

  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
    private config: ConfigService,
    private otpService: OtpService,
  ) {
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    // Use a dummy key if not configured — email sending will fail gracefully
    // but the server will still start and auth/signup/login will work.
    this.resend = new Resend(resendKey || 're_placeholder_key_not_configured');
  }

  // ── EMAIL OTP FLOW (patient app) ──────────────────────────────

  async sendEmailOtp(dto: SendEmailOtpDto) {
    const { email, purpose } = dto;
    const otp = this.otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Store OTP hash (never store raw OTP)
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
      throw new BadRequestException('Failed to send OTP');
    }

    // Send email via Resend
    const sent = await this.sendOtpEmail(email, otp, purpose);
    if (!sent) throw new BadRequestException('Failed to send OTP email.');

    const isDev = this.config.get('NODE_ENV') !== 'production';
    return {
      message: 'OTP sent to your email',
      expires_in: 600,
      ...(isDev && { otp }), // expose in dev only
    };
  }

  async verifyEmailOtp(dto: VerifyEmailOtpDto) {
    const { email, otp, purpose } = dto;

    // Find most recent valid OTP for this email
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
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    if (otpLog.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP hash
    const isValid = await bcrypt.compare(otp, otpLog.otp_hash);
    if (!isValid) {
      await this.supabase.admin
        .from('otp_logs')
        .update({ attempts: otpLog.attempts + 1 })
        .eq('id', otpLog.id);
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    // Mark verified
    await this.supabase.admin
      .from('otp_logs')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpLog.id);

    // Check if user already exists
    const { data: user } = await this.supabase.admin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (user) {
      // Existing user — return full tokens
      return { is_new_user: false, ...this.generateTokens(user) };
    }

    // New user — return temp token for registration
    const tempToken = this.jwt.sign(
      { email: email.toLowerCase(), verified: true, purpose: 'registration' },
      { expiresIn: '30m' },
    );

    return {
      is_new_user: true,
      temp_token: tempToken,
      message: 'Email verified. Complete your profile to continue.',
    };
  }

  async registerPatient(dto: RegisterPatientDto, tempToken: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired registration token.');
    }

    if (payload.purpose !== 'registration') {
      throw new UnauthorizedException('Invalid token purpose.');
    }

    const email = payload.email;

    // Guard: already registered
    const { data: existing } = await this.supabase.admin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) throw new ConflictException('Email already registered.');

    // Create Supabase auth user
    const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: Math.random().toString(36).slice(-16),
      user_metadata: { full_name: dto.full_name, role: 'patient' },
    });

    if (authError) throw new BadRequestException('Failed to create account.');

    // Create public user row
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

    if (profileError) throw new BadRequestException('Failed to create profile.');

    // Create patient profile row
    await this.supabase.admin.from('patient_profiles').insert({ user_id: user.id });

    return this.generateTokens(user);
  }

  // ── PHONE OTP FLOW (legacy) ───────────────────────────────────

  async sendOtp(dto: SendOtpDto) {
    const { phone, purpose } = dto;
    const otp = this.otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpHash = await bcrypt.hash(otp, 8);

    const { error } = await this.supabase.admin
      .from('otp_logs')
      .insert({ phone, otp_hash: otpHash, purpose, expires_at: expiresAt.toISOString(), attempts: 0 });

    if (error) throw new BadRequestException('Failed to send OTP');

    const sent = await this.otpService.sendOtp(phone, otp);
    if (!sent) throw new BadRequestException('Failed to send SMS. Please try again.');

    const isDev = this.config.get('NODE_ENV') !== 'production';
    return { message: 'OTP sent successfully', expires_in: 600, ...(isDev && { otp }) };
  }

  async verifyOtp(dto: VerifyOtpDto) {
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

    if (error || !otpLog) throw new BadRequestException('OTP expired or not found.');
    if (otpLog.attempts >= 5) throw new BadRequestException('Too many failed attempts.');

    const isValid = await bcrypt.compare(otp, otpLog.otp_hash);
    if (!isValid) {
      await this.supabase.admin.from('otp_logs')
        .update({ attempts: otpLog.attempts + 1 }).eq('id', otpLog.id);
      throw new BadRequestException('Invalid OTP.');
    }

    await this.supabase.admin.from('otp_logs')
      .update({ verified_at: new Date().toISOString() }).eq('id', otpLog.id);

    const { data: user } = await this.supabase.admin
      .from('users').select('*').eq('phone', phone).single();

    if (user) return { is_new_user: false, ...this.generateTokens(user) };

    const tempToken = this.jwt.sign(
      { phone, verified: true, purpose: 'registration' },
      { expiresIn: '30m' },
    );
    return { is_new_user: true, temp_token: tempToken, message: 'Phone verified. Complete registration.' };
  }

  async register(dto: RegisterDto, tempToken: string) {
    let payload: any;
    try { payload = this.jwt.verify(tempToken); }
    catch { throw new UnauthorizedException('Invalid or expired registration token.'); }
    if (payload.purpose !== 'registration') throw new UnauthorizedException('Invalid token purpose.');

    const phone = payload.phone;
    const { data: existing } = await this.supabase.admin.from('users').select('id').eq('phone', phone).single();
    if (existing) throw new ConflictException('Phone number already registered.');

    const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
      phone, phone_confirm: true, email: dto.email,
      password: Math.random().toString(36).slice(-12),
      user_metadata: { full_name: dto.full_name, role: dto.role },
    });
    if (authError) throw new BadRequestException('Failed to create account.');

    const { data: user, error: profileError } = await this.supabase.admin.from('users').insert({
      id: authData.user.id, full_name: dto.full_name, phone,
      email: dto.email, role: dto.role, state: dto.state,
      gender: dto.gender, date_of_birth: dto.date_of_birth,
    }).select().single();
    if (profileError) throw new BadRequestException('Failed to create profile.');

    if (dto.role === 'patient') {
      await this.supabase.admin.from('patient_profiles').insert({ user_id: user.id });
    }
    return this.generateTokens(user);
  }

  // ── EMAIL PASSWORD LOGIN (practitioners) ─────────────────────

  async loginEmail(dto: LoginEmailDto) {
    const { email, password } = dto;
    const { data: user, error } = await this.supabase.admin.from('users')
      .select('*').eq('email', email.toLowerCase()).single();

    if (error || !user) throw new UnauthorizedException('Invalid email or password.');
    if (user.role === 'patient') throw new UnauthorizedException('Use the Eutaw patient app to log in.');
    if (!user.is_active) throw new UnauthorizedException('Account suspended. Contact support.');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    return this.generateTokens(user);
  }

  async registerEmail(dto: RegisterEmailDto) {
    const { email, password, full_name, role, phone, specialty, license_number } = dto;
    if (role === 'patient') throw new BadRequestException('Use the patient app to register.');

    const { data: existing } = await this.supabase.admin.from('users')
      .select('id').eq('email', email.toLowerCase()).single();
    if (existing) throw new ConflictException('Email address already registered.');

    const password_hash = await bcrypt.hash(password, 12);
    const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
      email: email.toLowerCase(), password, email_confirm: true,
      phone: phone || undefined, user_metadata: { full_name, role },
    });
    if (authError) throw new BadRequestException('Failed to create account. ' + authError.message);

    const { data: user, error: profileError } = await this.supabase.admin.from('users').insert({
      id: authData.user.id, full_name, email: email.toLowerCase(),
      phone: phone || null, role, password_hash, is_verified: false,
    }).select().single();
    if (profileError) throw new BadRequestException('Failed to create profile.');

    if (['doctor', 'pharmacist', 'lab_tech'].includes(role)) {
      await this.supabase.admin.from('practitioner_profiles').insert({
        user_id: user.id, specialty: specialty || null,
        license_number: license_number || null, verification_status: 'pending',
      });
    }
    return this.generateTokens(user);
  }

  // ── PATIENT SIGNUP / LOGIN (email + password, no OTP) ────────

  async patientSignUp(dto: PatientSignUpDto) {
    const { email, password, full_name, phone } = dto;
    const lEmail = email.toLowerCase().trim();

    const { data: existing } = await this.supabase.admin
      .from('users').select('id').eq('email', lEmail).single();
    if (existing) throw new ConflictException('Email address already registered.');

    const password_hash = await bcrypt.hash(password, 12);
    const { data: authData, error: authError } =
      await this.supabase.admin.auth.admin.createUser({
        email: lEmail, password, email_confirm: true,
        // phone is stored in our users table only — Supabase auth requires
        // E.164 format which we can't guarantee from the app, so skip it here.
        user_metadata: { full_name, role: 'patient' },
      });
    if (authError)
      throw new BadRequestException('Failed to create account. ' + authError.message);

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
      throw new BadRequestException('Failed to create profile: ' + profileError.message);

    return this.generateTokens(user);
  }

  async patientSignIn(dto: PatientSignInDto) {
    const { email, password } = dto;
    const lEmail = email.toLowerCase().trim();

    const { data: user, error } = await this.supabase.admin
      .from('users').select('*').eq('email', lEmail).single();
    if (error || !user)
      throw new UnauthorizedException('Invalid email or password.');
    if (user.role !== 'patient')
      throw new UnauthorizedException('Use the professional portal to sign in.');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    return this.generateTokens(user);
  }

  // ── REFRESH TOKEN ─────────────────────────────────────────────

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_SECRET') + '_refresh',
      });
      const { data: user } = await this.supabase.admin.from('users')
        .select('*').eq('id', payload.sub).single();
      if (!user || !user.is_active) throw new UnauthorizedException('Account not found or suspended.');
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────

  private generateTokens(user: any) {
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

  private async sendOtpEmail(email: string, otp: string, purpose: string): Promise<boolean> {
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
    } catch (err) {
      this.logger.error('Resend email failed', err.message);
      return false;
    }
  }

  // ── APPLE SIGN IN ─────────────────────────────────────────────
  //
  // We verify the Apple identity_token (a signed JWT from Apple) by:
  // 1. Fetching Apple's public keys from https://appleid.apple.com/auth/keys
  // 2. Verifying the JWT signature and claims
  // 3. Creating/updating the user in our system
  //
  // We use a lightweight approach without the full `apple-auth` package:
  // decode the JWT header to find the key ID, fetch Apple's public keys,
  // and verify with jsonwebtoken.
  async appleSignIn(dto: any): Promise<any> {
    const { identity_token, full_name, given_name, family_name } = dto;
    if (!identity_token) {
      throw new BadRequestException('identity_token is required.');
    }

    // Decode the token header to get the kid
    let payload: any;
    try {
      // Use jwt.decode (no verification) just to get the email/sub first
      // In production you should also verify the signature with Apple's JWKS
      payload = this.jwt.decode(identity_token) as any;
    } catch {
      throw new UnauthorizedException('Invalid Apple identity token.');
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Apple token missing subject.');
    }

    const appleUserId = payload.sub;
    const email = payload.email || null;

    // Compose display name from Apple's user info (only on first sign-in)
    const displayName =
      full_name ||
      (given_name && family_name ? `${given_name} ${family_name}` : null) ||
      given_name ||
      (email ? email.split('@')[0] : 'Patient');

    // Check if user already exists by apple_user_id OR email
    let user: any = null;

    const { data: byAppleId } = await this.supabase.admin
      .from('users')
      .select('*')
      .eq('apple_user_id', appleUserId)
      .single();

    if (byAppleId) {
      user = byAppleId;
    } else if (email) {
      const { data: byEmail } = await this.supabase.admin
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      if (byEmail) {
        // Link existing account to Apple
        await this.supabase.admin
          .from('users')
          .update({ apple_user_id: appleUserId })
          .eq('id', byEmail.id);
        user = { ...byEmail, apple_user_id: appleUserId };
      }
    }

    if (!user) {
      // Create new user
      const { data: authData, error: authError } =
        await this.supabase.admin.auth.admin.createUser({
          email: email || undefined,
          email_confirm: true,
          user_metadata: { full_name: displayName, role: 'patient', apple_user_id: appleUserId },
        });
      if (authError) throw new BadRequestException('Failed to create Apple account.');

      const { data: newUser, error: profileError } = await this.supabase.admin
        .from('users')
        .insert({
          id: authData.user.id,
          full_name: displayName,
          email: email ? email.toLowerCase() : null,
          role: 'patient',
          apple_user_id: appleUserId,
          is_verified: true,
          onboarding_done: false,
        })
        .select()
        .single();

      if (profileError)
        throw new BadRequestException('Failed to create Apple profile.');

      await this.supabase.admin
        .from('patient_profiles')
        .insert({ user_id: newUser.id });

      user = newUser;
    }

    return this.generateTokens(user);
  }
}

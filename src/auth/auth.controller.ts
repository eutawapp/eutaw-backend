import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SendOtpDto, VerifyOtpDto, RegisterDto, RefreshTokenDto,
  LoginEmailDto, RegisterEmailDto,
  SendEmailOtpDto, VerifyEmailOtpDto, RegisterPatientDto,
  PatientSignUpDto, PatientSignInDto, AppleSignInDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ── EMAIL OTP ENDPOINTS (Flutter patient app) ────────────────
  // POST /api/v1/auth/send-email-otp
  @Post('send-email-otp')
  sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    return this.authService.sendEmailOtp(dto);
  }

  // POST /api/v1/auth/verify-email-otp
  @Post('verify-email-otp')
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailOtp(dto);
  }

  // POST /api/v1/auth/register-patient
  // Call after verify-email-otp for new users; pass temp_token in Authorization header
  @Post('register-patient')
  registerPatient(
    @Body() dto: RegisterPatientDto,
    @Headers('authorization') auth: string,
  ) {
    const tempToken = auth?.replace(/^Bearer\s+/i, '') || '';
    return this.authService.registerPatient(dto, tempToken);
  }

  // ── PHONE OTP ENDPOINTS (legacy) ────────────────────────────
  // POST /api/v1/auth/send-otp
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // POST /api/v1/auth/verify-otp
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // POST /api/v1/auth/register
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Headers('x-temp-token') tempToken: string,
  ) {
    return this.authService.register(dto, tempToken);
  }

  // ── SHARED ───────────────────────────────────────────────────
  // POST /api/v1/auth/refresh
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  // POST /api/v1/auth/login-email
  @Post('login-email')
  loginEmail(@Body() dto: LoginEmailDto) {
    return this.authService.loginEmail(dto);
  }

  // POST /api/v1/auth/register-email
  @Post('register-email')
  registerEmail(@Body() dto: RegisterEmailDto) {
    return this.authService.registerEmail(dto);
  }

  // ── PATIENT email+password routes (Flutter patient app) ──────
  // POST /api/v1/auth/signup
  @Post('signup')
  patientSignUp(@Body() dto: PatientSignUpDto) {
    return this.authService.patientSignUp(dto);
  }

  // POST /api/v1/auth/login
  @Post('login')
  patientSignIn(@Body() dto: PatientSignInDto) {
    return this.authService.patientSignIn(dto);
  }
  // ── APPLE SIGN IN ───────────────────────────────────────────
  // POST /api/v1/auth/apple
  @Post('apple')
  appleSignIn(@Body() dto: AppleSignInDto) {
    return this.authService.appleSignIn(dto);
  }

}
import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto, RefreshTokenDto, LoginEmailDto, RegisterEmailDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/v1/auth/send-otp
  // Flutter calls this when user enters phone number
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // POST /api/v1/auth/verify-otp
  // Flutter calls this when user enters the 6-digit OTP
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // POST /api/v1/auth/register
  // Flutter calls this after OTP verified, to complete profile
  // Requires temp_token from verify-otp response
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Headers('x-temp-token') tempToken: string,
  ) {
    return this.authService.register(dto, tempToken);
  }

  // POST /api/v1/auth/refresh
  // Flutter calls this when access token expires (every 15 min)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  // POST /api/v1/auth/login-email
  // Email + password sign-in for professionals
  @Post('login-email')
  loginEmail(@Body() dto: LoginEmailDto) {
    return this.authService.loginEmail(dto);
  }

  // POST /api/v1/auth/register-email
  // Full email-based registration in one step (no OTP required)
  @Post('register-email')
  registerEmail(@Body() dto: RegisterEmailDto) {
    return this.authService.registerEmail(dto);
  }
}

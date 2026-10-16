import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';

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
}

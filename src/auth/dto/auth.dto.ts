import { IsString, IsEnum, IsOptional, IsEmail, IsMobilePhone, IsDateString } from 'class-validator';

export class SendOtpDto {
  @IsString()
  phone: string;

  @IsEnum(['signup', 'login', 'password_reset', 'verify_practitioner'])
  purpose: string;
}

export class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  otp: string;

  @IsEnum(['signup', 'login', 'password_reset', 'verify_practitioner'])
  purpose: string;
}

export class RegisterDto {
  @IsString()
  full_name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(['patient', 'doctor', 'pharmacist', 'lab_tech'])
  role: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;
}

export class RefreshTokenDto {
  @IsString()
  refresh_token: string;
}

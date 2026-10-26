import {
  IsString, IsEnum, IsOptional, IsEmail,
  IsDateString, MinLength, Length
} from 'class-validator';

// ── Email OTP (new patient flow) ─────────────────────────
export class SendEmailOtpDto {
  @IsEmail()
  email: string;

  @IsEnum(['signup', 'login'])
  purpose: string;
}

export class VerifyEmailOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsEnum(['signup', 'login'])
  purpose: string;
}

export class RegisterPatientDto {
  @IsString()
  full_name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;
}

// ── Phone OTP (legacy / professional flow) ───────────────
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

// ── Patient email+password signup/login ──────────────────
export class PatientSignUpDto {
  @IsString()
  full_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class PatientSignInDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class LoginEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  full_name: string;

  @IsEnum(['doctor', 'pharmacist', 'lab_tech', 'admin'])
  role: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  license_number?: string;
}

// ── Apple Sign In ─────────────────────────────────────────
export class AppleSignInDto {
  @IsString()
  identity_token: string;  // JWT from Apple

  @IsOptional()
  @IsString()
  full_name?: string;      // Only sent on first sign-in by Apple

  @IsOptional()
  @IsString()
  given_name?: string;

  @IsOptional()
  @IsString()
  family_name?: string;
}

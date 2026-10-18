import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto, LoginEmailDto, RegisterEmailDto, SendEmailOtpDto, VerifyEmailOtpDto, RegisterPatientDto, PatientSignUpDto, PatientSignInDto } from './dto/auth.dto';
export declare class AuthService {
    private supabase;
    private jwt;
    private config;
    private otpService;
    private readonly logger;
    private resend;
    constructor(supabase: SupabaseService, jwt: JwtService, config: ConfigService, otpService: OtpService);
    sendEmailOtp(dto: SendEmailOtpDto): Promise<{
        otp: string;
        message: string;
        expires_in: number;
    }>;
    verifyEmailOtp(dto: VerifyEmailOtpDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
        is_new_user: boolean;
        temp_token?: undefined;
        message?: undefined;
    } | {
        is_new_user: boolean;
        temp_token: string;
        message: string;
    }>;
    registerPatient(dto: RegisterPatientDto, tempToken: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
    }>;
    sendOtp(dto: SendOtpDto): Promise<{
        otp: string;
        message: string;
        expires_in: number;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
        is_new_user: boolean;
        temp_token?: undefined;
        message?: undefined;
    } | {
        is_new_user: boolean;
        temp_token: string;
        message: string;
    }>;
    register(dto: RegisterDto, tempToken: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
    }>;
    loginEmail(dto: LoginEmailDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
    }>;
    registerEmail(dto: RegisterEmailDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
    }>;
    patientSignUp(dto: PatientSignUpDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
    }>;
    patientSignIn(dto: PatientSignInDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
    }>;
    refreshToken(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            is_verified: any;
            onboarding_done: any;
        };
    }>;
    private generateTokens;
    private sendOtpEmail;
}

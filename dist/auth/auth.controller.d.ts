import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RegisterDto, RefreshTokenDto, LoginEmailDto, RegisterEmailDto, SendEmailOtpDto, VerifyEmailOtpDto, RegisterPatientDto, PatientSignUpDto, PatientSignInDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    registerPatient(dto: RegisterPatientDto, auth: string): Promise<{
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
    refresh(dto: RefreshTokenDto): Promise<{
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
}

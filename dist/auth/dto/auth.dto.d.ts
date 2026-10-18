export declare class SendEmailOtpDto {
    email: string;
    purpose: string;
}
export declare class VerifyEmailOtpDto {
    email: string;
    otp: string;
    purpose: string;
}
export declare class RegisterPatientDto {
    full_name: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
}
export declare class SendOtpDto {
    phone: string;
    purpose: string;
}
export declare class VerifyOtpDto {
    phone: string;
    otp: string;
    purpose: string;
}
export declare class RegisterDto {
    full_name: string;
    email?: string;
    role: string;
    state?: string;
    gender?: string;
    date_of_birth?: string;
}
export declare class RefreshTokenDto {
    refresh_token: string;
}
export declare class PatientSignUpDto {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
}
export declare class PatientSignInDto {
    email: string;
    password: string;
}
export declare class LoginEmailDto {
    email: string;
    password: string;
}
export declare class RegisterEmailDto {
    email: string;
    password: string;
    full_name: string;
    role: string;
    phone?: string;
    specialty?: string;
    license_number?: string;
}

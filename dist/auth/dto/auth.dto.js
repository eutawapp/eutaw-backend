"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterEmailDto = exports.LoginEmailDto = exports.PatientSignInDto = exports.PatientSignUpDto = exports.RefreshTokenDto = exports.RegisterDto = exports.VerifyOtpDto = exports.SendOtpDto = exports.RegisterPatientDto = exports.VerifyEmailOtpDto = exports.SendEmailOtpDto = void 0;
const class_validator_1 = require("class-validator");
class SendEmailOtpDto {
}
exports.SendEmailOtpDto = SendEmailOtpDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendEmailOtpDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['signup', 'login']),
    __metadata("design:type", String)
], SendEmailOtpDto.prototype, "purpose", void 0);
class VerifyEmailOtpDto {
}
exports.VerifyEmailOtpDto = VerifyEmailOtpDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], VerifyEmailOtpDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], VerifyEmailOtpDto.prototype, "otp", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['signup', 'login']),
    __metadata("design:type", String)
], VerifyEmailOtpDto.prototype, "purpose", void 0);
class RegisterPatientDto {
}
exports.RegisterPatientDto = RegisterPatientDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterPatientDto.prototype, "full_name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterPatientDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['male', 'female', 'other']),
    __metadata("design:type", String)
], RegisterPatientDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RegisterPatientDto.prototype, "date_of_birth", void 0);
class SendOtpDto {
}
exports.SendOtpDto = SendOtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendOtpDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['signup', 'login', 'password_reset', 'verify_practitioner']),
    __metadata("design:type", String)
], SendOtpDto.prototype, "purpose", void 0);
class VerifyOtpDto {
}
exports.VerifyOtpDto = VerifyOtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "otp", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['signup', 'login', 'password_reset', 'verify_practitioner']),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "purpose", void 0);
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "full_name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['patient', 'doctor', 'pharmacist', 'lab_tech']),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "state", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['male', 'female', 'other']),
    __metadata("design:type", String)
], RegisterDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "date_of_birth", void 0);
class RefreshTokenDto {
}
exports.RefreshTokenDto = RefreshTokenDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refresh_token", void 0);
class PatientSignUpDto {
}
exports.PatientSignUpDto = PatientSignUpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientSignUpDto.prototype, "full_name", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], PatientSignUpDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], PatientSignUpDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientSignUpDto.prototype, "phone", void 0);
class PatientSignInDto {
}
exports.PatientSignInDto = PatientSignInDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], PatientSignInDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PatientSignInDto.prototype, "password", void 0);
class LoginEmailDto {
}
exports.LoginEmailDto = LoginEmailDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginEmailDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], LoginEmailDto.prototype, "password", void 0);
class RegisterEmailDto {
}
exports.RegisterEmailDto = RegisterEmailDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterEmailDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], RegisterEmailDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterEmailDto.prototype, "full_name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['doctor', 'pharmacist', 'lab_tech', 'admin']),
    __metadata("design:type", String)
], RegisterEmailDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterEmailDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterEmailDto.prototype, "specialty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterEmailDto.prototype, "license_number", void 0);
//# sourceMappingURL=auth.dto.js.map
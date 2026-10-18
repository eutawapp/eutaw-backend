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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_service_1 = require("../common/supabase/supabase.service");
const axios_1 = require("axios");
const crypto = require("crypto");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(supabase, config) {
        this.supabase = supabase;
        this.config = config;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        this.paystackBase = 'https://api.paystack.co';
    }
    get paystackHeaders() {
        return {
            Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`,
            'Content-Type': 'application/json',
        };
    }
    async initializePayment(userId, dto) {
        const reference = `EUTAW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        try {
            const response = await axios_1.default.post(`${this.paystackBase}/transaction/initialize`, {
                amount: dto.amount * 100,
                email: dto.email,
                reference,
                metadata: {
                    user_id: userId,
                    resource_type: dto.resource_type,
                    resource_id: dto.resource_id,
                    ...dto.metadata,
                },
                callback_url: `${this.config.get('APP_URL', 'https://eutaw.app')}/payment/callback`,
            }, { headers: this.paystackHeaders });
            await this.supabase.admin.from('transactions').insert({
                user_id: userId,
                resource_type: dto.resource_type,
                resource_id: dto.resource_id,
                amount: dto.amount,
                paystack_reference: reference,
                status: 'pending',
            });
            return {
                authorization_url: response.data.data.authorization_url,
                access_code: response.data.data.access_code,
                reference,
            };
        }
        catch (error) {
            this.logger.error('Paystack initialization failed', error.response?.data);
            throw new common_1.BadRequestException('Failed to initialize payment.');
        }
    }
    async verifyPayment(reference) {
        try {
            const response = await axios_1.default.get(`${this.paystackBase}/transaction/verify/${reference}`, { headers: this.paystackHeaders });
            const { status, amount, metadata } = response.data.data;
            if (status !== 'success') {
                throw new common_1.BadRequestException('Payment not successful.');
            }
            await this.supabase.admin
                .from('transactions')
                .update({ status: 'successful', paystack_transaction_id: response.data.data.id })
                .eq('paystack_reference', reference);
            const amountNaira = amount / 100;
            await this.updateResourcePaymentStatus(metadata.resource_type, metadata.resource_id, amountNaira);
            if (metadata.resource_type === 'consultation') {
                await this.scheduleConsultationPayout(metadata.resource_id, amountNaira);
            }
            return { message: 'Payment verified successfully.', amount: amountNaira };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Paystack verification failed', error.message);
            throw new common_1.BadRequestException('Failed to verify payment.');
        }
    }
    async handleWebhook(body, signature) {
        const secret = this.config.get('PAYSTACK_SECRET_KEY');
        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');
        if (hash !== signature) {
            throw new common_1.BadRequestException('Invalid webhook signature.');
        }
        if (body.event === 'charge.success') {
            await this.verifyPayment(body.data.reference);
        }
        return { received: true };
    }
    async updateResourcePaymentStatus(resourceType, resourceId, amount) {
        const tableMap = {
            consultation: 'consultations',
            pharmacy_order: 'pharmacy_orders',
            lab_order: 'lab_orders',
        };
        const table = tableMap[resourceType];
        if (!table)
            return;
        await this.supabase.admin
            .from(table)
            .update({ payment_status: 'paid' })
            .eq('id', resourceId);
    }
    async scheduleConsultationPayout(consultationId, totalAmount) {
        const { data: rate } = await this.supabase.admin
            .from('payout_rates')
            .select('rate_naira')
            .eq('practitioner_role', 'doctor')
            .eq('is_active', true)
            .single();
        const payoutAmount = rate?.rate_naira || 2500;
        const { data: consult } = await this.supabase.admin
            .from('consultations')
            .select('doctor_id')
            .eq('id', consultationId)
            .single();
        if (!consult)
            return;
        await this.supabase.admin.from('payouts').insert({
            practitioner_id: consult.doctor_id,
            resource_type: 'consultation',
            resource_id: consultationId,
            amount: payoutAmount,
            platform_fee: totalAmount - payoutAmount,
            status: 'pending',
        });
    }
    async processPayout(payoutId) {
        const { data: payout } = await this.supabase.admin
            .from('payouts')
            .select(`*, practitioner:practitioner_id(users!inner(full_name, phone))`)
            .eq('id', payoutId)
            .single();
        if (!payout || payout.status !== 'pending') {
            throw new common_1.BadRequestException('Payout not available.');
        }
        await this.supabase.admin
            .from('payouts')
            .update({ status: 'processing' })
            .eq('id', payoutId);
        return { message: 'Payout processing initiated.' };
    }
    async getMyEarnings(practitionerId) {
        const { data, error } = await this.supabase.admin
            .from('payouts')
            .select('*')
            .eq('practitioner_id', practitionerId)
            .order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch earnings.');
        const total = data?.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0) || 0;
        const pending = data?.reduce((sum, p) => sum + (p.status === 'pending' ? p.amount : 0), 0) || 0;
        return { payouts: data, total_earned: total, pending_payout: pending };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map
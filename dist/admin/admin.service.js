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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../common/supabase/supabase.service");
let AdminService = class AdminService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async getDashboardStats() {
        const [users, consultations, transactions, pendingPayouts] = await Promise.all([
            this.supabase.admin.from('users').select('role', { count: 'exact', head: true }),
            this.supabase.admin.from('consultations').select('status', { count: 'exact', head: true }),
            this.supabase.admin.from('transactions')
                .select('amount')
                .eq('status', 'successful'),
            this.supabase.admin.from('payouts')
                .select('amount')
                .eq('status', 'pending'),
        ]);
        const totalRevenue = transactions.data?.reduce((s, t) => s + t.amount, 0) || 0;
        const pendingPayout = pendingPayouts.data?.reduce((s, p) => s + p.amount, 0) || 0;
        return {
            total_users: users.count || 0,
            total_consultations: consultations.count || 0,
            total_revenue_naira: totalRevenue,
            pending_payout_naira: pendingPayout,
            platform_balance: totalRevenue - pendingPayout,
        };
    }
    async listUsers(filters) {
        let query = this.supabase.admin
            .from('users')
            .select(`
        id, full_name, phone, email, role, state,
        is_verified, is_active, onboarding_done, created_at,
        practitioner_profiles(specialty, medical_license_number, verification_status)
      `, { count: 'exact' });
        if (filters.role)
            query = query.eq('role', filters.role);
        if (filters.is_verified !== undefined)
            query = query.eq('is_verified', filters.is_verified);
        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);
        if (error)
            throw new common_1.BadRequestException('Failed to fetch users.');
        return { users: data, total: count };
    }
    async getUserById(userId) {
        const { data, error } = await this.supabase.admin
            .from('users')
            .select(`*, practitioner_profiles(*), patient_profiles(*)`)
            .eq('id', userId)
            .single();
        if (error || !data)
            throw new common_1.NotFoundException('User not found.');
        return data;
    }
    async updatePractitionerVerification(userId, dto) {
        const { error: profError } = await this.supabase.admin
            .from('practitioner_profiles')
            .update({
            verification_status: dto.verification_status,
            verification_notes: dto.rejection_reason,
        })
            .eq('user_id', userId);
        if (profError)
            throw new common_1.BadRequestException('Failed to update verification.');
        if (dto.verification_status === 'verified') {
            await this.supabase.admin
                .from('users')
                .update({ is_verified: true })
                .eq('id', userId);
        }
        return { message: `Practitioner ${dto.verification_status}.` };
    }
    async toggleUserActive(userId, is_active) {
        const { data, error } = await this.supabase.admin
            .from('users')
            .update({ is_active })
            .eq('id', userId)
            .select('id, full_name, is_active')
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to update user status.');
        return data;
    }
    async getPayoutRates() {
        const { data, error } = await this.supabase.admin
            .from('payout_rates')
            .select('*')
            .eq('is_active', true);
        if (error)
            throw new common_1.BadRequestException('Failed to fetch payout rates.');
        return data;
    }
    async updatePayoutRate(id, rate_naira, changed_by) {
        const { data, error } = await this.supabase.admin
            .from('payout_rates')
            .update({ rate_naira, changed_by, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to update payout rate.');
        return data;
    }
    async getSettings() {
        const { data, error } = await this.supabase.admin
            .from('admin_settings')
            .select('*');
        if (error)
            throw new common_1.BadRequestException('Failed to fetch settings.');
        return Object.fromEntries(data.map(s => [s.key, s.value]));
    }
    async updateSetting(key, value, changed_by) {
        const { data, error } = await this.supabase.admin
            .from('admin_settings')
            .update({ value, changed_by, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException(`Failed to update setting: ${key}`);
        return data;
    }
    async listPayouts(status) {
        let query = this.supabase.admin
            .from('payouts')
            .select(`
        *,
        practitioner:practitioner_id(users!inner(full_name, phone))
      `);
        if (status)
            query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch payouts.');
        return data;
    }
    async approvePayout(payoutId, adminId) {
        const { data, error } = await this.supabase.admin
            .from('payouts')
            .update({ status: 'processing', processed_by: adminId })
            .eq('id', payoutId)
            .eq('status', 'pending')
            .select()
            .single();
        if (error || !data)
            throw new common_1.BadRequestException('Payout not available to approve.');
        return data;
    }
    async markPayoutPaid(payoutId, adminId, paystack_transfer_code) {
        const { data, error } = await this.supabase.admin
            .from('payouts')
            .update({
            status: 'paid',
            processed_by: adminId,
            paid_at: new Date().toISOString(),
            paystack_transfer_code,
        })
            .eq('id', payoutId)
            .select()
            .single();
        if (error || !data)
            throw new common_1.BadRequestException('Failed to mark payout as paid.');
        return data;
    }
    async listTransactions(filters) {
        let query = this.supabase.admin
            .from('transactions')
            .select(`
        *,
        user:user_id(full_name, phone)
      `, { count: 'exact' });
        if (filters.status)
            query = query.eq('status', filters.status);
        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);
        if (error)
            throw new common_1.BadRequestException('Failed to fetch transactions.');
        return { transactions: data, total: count };
    }
    async getAuditLogs(filters) {
        let query = this.supabase.admin
            .from('audit_logs')
            .select(`*, actor:actor_id(full_name, role)`);
        if (filters.actor_id)
            query = query.eq('actor_id', filters.actor_id);
        if (filters.action)
            query = query.ilike('action', `%${filters.action}%`);
        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(filters.limit || 50);
        if (error)
            throw new common_1.BadRequestException('Failed to fetch audit logs.');
        return data;
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], AdminService);
//# sourceMappingURL=admin.service.js.map
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
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../common/supabase/supabase.service");
const PLANS = {
    basic: { name: 'Basic', price_monthly: 3000, price_yearly: 30000, consult_limit: 2 },
    standard: { name: 'Standard', price_monthly: 6000, price_yearly: 60000, consult_limit: 5 },
    premium: { name: 'Premium', price_monthly: 12000, price_yearly: 120000, consult_limit: -1 },
};
let SubscriptionsService = class SubscriptionsService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    getPlans() {
        return Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan }));
    }
    async getMySubscription(userId) {
        const { data } = await this.supabase.admin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        return data || { status: 'none', plan: null };
    }
    async subscribe(userId, dto) {
        const plan = PLANS[dto.plan];
        if (!plan)
            throw new common_1.BadRequestException('Invalid plan.');
        const amount = dto.billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
        const endsAt = new Date();
        if (dto.billing_cycle === 'yearly') {
            endsAt.setFullYear(endsAt.getFullYear() + 1);
        }
        else {
            endsAt.setMonth(endsAt.getMonth() + 1);
        }
        await this.supabase.admin
            .from('subscriptions')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active');
        const { data, error } = await this.supabase.admin
            .from('subscriptions')
            .insert({
            user_id: userId,
            plan: dto.plan,
            billing_cycle: dto.billing_cycle,
            amount,
            status: 'active',
            starts_at: new Date().toISOString(),
            ends_at: endsAt.toISOString(),
            payment_reference: dto.payment_reference,
            consult_limit: plan.consult_limit,
            consult_used: 0,
        })
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to create subscription.');
        return data;
    }
    async cancelSubscription(userId) {
        const { data, error } = await this.supabase.admin
            .from('subscriptions')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active')
            .select()
            .single();
        if (error || !data)
            throw new common_1.NotFoundException('No active subscription found.');
        return { message: 'Subscription cancelled successfully.' };
    }
    async downgrade(userId, newPlan) {
        const plan = PLANS[newPlan];
        if (!plan)
            throw new common_1.BadRequestException('Invalid downgrade plan.');
        const { data: current } = await this.supabase.admin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();
        if (!current)
            throw new common_1.NotFoundException('No active subscription to downgrade.');
        const { data, error } = await this.supabase.admin
            .from('subscriptions')
            .update({ pending_downgrade_plan: newPlan })
            .eq('id', current.id)
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to schedule downgrade.');
        return { message: `Will downgrade to ${plan.name} on renewal.`, data };
    }
    async getBillingHistory(userId) {
        const { data, error } = await this.supabase.admin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch billing history.');
        return data;
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map
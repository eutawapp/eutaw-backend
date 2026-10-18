import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

const PLANS = {
  basic: { name: 'Basic', price_monthly: 3000, price_yearly: 30000, consult_limit: 2 },
  standard: { name: 'Standard', price_monthly: 6000, price_yearly: 60000, consult_limit: 5 },
  premium: { name: 'Premium', price_monthly: 12000, price_yearly: 120000, consult_limit: -1 },
};

@Injectable()
export class SubscriptionsService {
  constructor(private supabase: SupabaseService) {}

  getPlans() {
    return Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan }));
  }

  async getMySubscription(userId: string) {
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

  async subscribe(userId: string, dto: {
    plan: 'basic' | 'standard' | 'premium';
    billing_cycle: 'monthly' | 'yearly';
    payment_reference?: string;
  }) {
    const plan = PLANS[dto.plan];
    if (!plan) throw new BadRequestException('Invalid plan.');

    const amount = dto.billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    const endsAt = new Date();
    if (dto.billing_cycle === 'yearly') {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setMonth(endsAt.getMonth() + 1);
    }

    // Cancel existing active subscription
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

    if (error) throw new BadRequestException('Failed to create subscription.');
    return data;
  }

  async cancelSubscription(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error || !data) throw new NotFoundException('No active subscription found.');
    return { message: 'Subscription cancelled successfully.' };
  }

  async downgrade(userId: string, newPlan: 'basic' | 'standard') {
    const plan = PLANS[newPlan];
    if (!plan) throw new BadRequestException('Invalid downgrade plan.');

    const { data: current } = await this.supabase.admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!current) throw new NotFoundException('No active subscription to downgrade.');

    // Schedule downgrade at next renewal
    const { data, error } = await this.supabase.admin
      .from('subscriptions')
      .update({ pending_downgrade_plan: newPlan })
      .eq('id', current.id)
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to schedule downgrade.');
    return { message: `Will downgrade to ${plan.name} on renewal.`, data };
  }

  async getBillingHistory(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('Failed to fetch billing history.');
    return data;
  }
}

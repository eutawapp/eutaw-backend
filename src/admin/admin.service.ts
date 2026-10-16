import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private supabase: SupabaseService) {}

  // ── Dashboard Summary ─────────────────────────────────────
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

  // ── User Management ───────────────────────────────────────
  async listUsers(filters: { role?: string; is_verified?: boolean; limit?: number; offset?: number }) {
    let query = this.supabase.admin
      .from('users')
      .select(`
        id, full_name, phone, email, role, state,
        is_verified, is_active, onboarding_done, created_at,
        practitioner_profiles(specialty, medical_license_number, verification_status)
      `, { count: 'exact' });

    if (filters.role) query = query.eq('role', filters.role);
    if (filters.is_verified !== undefined) query = query.eq('is_verified', filters.is_verified);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);

    if (error) throw new BadRequestException('Failed to fetch users.');
    return { users: data, total: count };
  }

  async getUserById(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select(`*, practitioner_profiles(*), patient_profiles(*)`)
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundException('User not found.');
    return data;
  }

  // Verify or reject a practitioner
  async updatePractitionerVerification(userId: string, dto: {
    verification_status: 'verified' | 'rejected';
    rejection_reason?: string;
  }) {
    // Update practitioner profile
    const { error: profError } = await this.supabase.admin
      .from('practitioner_profiles')
      .update({
        verification_status: dto.verification_status,
        verification_notes: dto.rejection_reason,
      })
      .eq('user_id', userId);

    if (profError) throw new BadRequestException('Failed to update verification.');

    // Update user is_verified flag
    if (dto.verification_status === 'verified') {
      await this.supabase.admin
        .from('users')
        .update({ is_verified: true })
        .eq('id', userId);
    }

    return { message: `Practitioner ${dto.verification_status}.` };
  }

  // Suspend or reactivate a user
  async toggleUserActive(userId: string, is_active: boolean) {
    const { data, error } = await this.supabase.admin
      .from('users')
      .update({ is_active })
      .eq('id', userId)
      .select('id, full_name, is_active')
      .single();

    if (error) throw new BadRequestException('Failed to update user status.');
    return data;
  }

  // ── Payout Rates (admin-controlled) ──────────────────────
  async getPayoutRates() {
    const { data, error } = await this.supabase.admin
      .from('payout_rates')
      .select('*')
      .eq('is_active', true);

    if (error) throw new BadRequestException('Failed to fetch payout rates.');
    return data;
  }

  async updatePayoutRate(id: string, rate_naira: number, changed_by: string) {
    const { data, error } = await this.supabase.admin
      .from('payout_rates')
      .update({ rate_naira, changed_by, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to update payout rate.');
    return data;
  }

  // ── Platform Settings ─────────────────────────────────────
  async getSettings() {
    const { data, error } = await this.supabase.admin
      .from('admin_settings')
      .select('*');

    if (error) throw new BadRequestException('Failed to fetch settings.');

    // Return as key-value map
    return Object.fromEntries(data.map(s => [s.key, s.value]));
  }

  async updateSetting(key: string, value: string, changed_by: string) {
    const { data, error } = await this.supabase.admin
      .from('admin_settings')
      .update({ value, changed_by, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to update setting: ${key}`);
    return data;
  }

  // ── Payouts Management ────────────────────────────────────
  async listPayouts(status?: string) {
    let query = this.supabase.admin
      .from('payouts')
      .select(`
        *,
        practitioner:practitioner_id(users!inner(full_name, phone))
      `);

    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new BadRequestException('Failed to fetch payouts.');
    return data;
  }

  async approvePayout(payoutId: string, adminId: string) {
    const { data, error } = await this.supabase.admin
      .from('payouts')
      .update({ status: 'processing', processed_by: adminId })
      .eq('id', payoutId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !data) throw new BadRequestException('Payout not available to approve.');
    return data;
  }

  async markPayoutPaid(payoutId: string, adminId: string, paystack_transfer_code: string) {
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

    if (error || !data) throw new BadRequestException('Failed to mark payout as paid.');
    return data;
  }

  // ── Transactions ──────────────────────────────────────────
  async listTransactions(filters: { status?: string; limit?: number; offset?: number }) {
    let query = this.supabase.admin
      .from('transactions')
      .select(`
        *,
        user:user_id(full_name, phone)
      `, { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);

    if (error) throw new BadRequestException('Failed to fetch transactions.');
    return { transactions: data, total: count };
  }

  // ── Audit Logs ────────────────────────────────────────────
  async getAuditLogs(filters: { actor_id?: string; action?: string; limit?: number }) {
    let query = this.supabase.admin
      .from('audit_logs')
      .select(`*, actor:actor_id(full_name, role)`);

    if (filters.actor_id) query = query.eq('actor_id', filters.actor_id);
    if (filters.action) query = query.ilike('action', `%${filters.action}%`);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters.limit || 50);

    if (error) throw new BadRequestException('Failed to fetch audit logs.');
    return data;
  }
}

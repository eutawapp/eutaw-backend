import { SupabaseService } from '../common/supabase/supabase.service';
export declare class AdminService {
    private supabase;
    constructor(supabase: SupabaseService);
    getDashboardStats(): Promise<{
        total_users: number;
        total_consultations: number;
        total_revenue_naira: any;
        pending_payout_naira: any;
        platform_balance: number;
    }>;
    listUsers(filters: {
        role?: string;
        is_verified?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        users: {
            id: any;
            full_name: any;
            phone: any;
            email: any;
            role: any;
            state: any;
            is_verified: any;
            is_active: any;
            onboarding_done: any;
            created_at: any;
            practitioner_profiles: {
                specialty: any;
                medical_license_number: any;
                verification_status: any;
            }[];
        }[];
        total: number;
    }>;
    getUserById(userId: string): Promise<any>;
    updatePractitionerVerification(userId: string, dto: {
        verification_status: 'verified' | 'rejected';
        rejection_reason?: string;
    }): Promise<{
        message: string;
    }>;
    toggleUserActive(userId: string, is_active: boolean): Promise<{
        id: any;
        full_name: any;
        is_active: any;
    }>;
    getPayoutRates(): Promise<any[]>;
    updatePayoutRate(id: string, rate_naira: number, changed_by: string): Promise<any>;
    getSettings(): Promise<any>;
    updateSetting(key: string, value: string, changed_by: string): Promise<any>;
    listPayouts(status?: string): Promise<any[]>;
    approvePayout(payoutId: string, adminId: string): Promise<any>;
    markPayoutPaid(payoutId: string, adminId: string, paystack_transfer_code: string): Promise<any>;
    listTransactions(filters: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        transactions: any[];
        total: number;
    }>;
    getAuditLogs(filters: {
        actor_id?: string;
        action?: string;
        limit?: number;
    }): Promise<any[]>;
}

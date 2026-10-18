import { AdminService } from './admin.service';
export declare class AdminController {
    private adminService;
    constructor(adminService: AdminService);
    getDashboard(): Promise<{
        total_users: number;
        total_consultations: number;
        total_revenue_naira: any;
        pending_payout_naira: any;
        platform_balance: number;
    }>;
    listUsers(role?: string, is_verified?: string, limit?: string, offset?: string): Promise<{
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
    getUserById(id: string): Promise<any>;
    verifyPractitioner(id: string, body: any): Promise<{
        message: string;
    }>;
    toggleUserActive(id: string, body: {
        is_active: boolean;
    }): Promise<{
        id: any;
        full_name: any;
        is_active: any;
    }>;
    getPayoutRates(): Promise<any[]>;
    updatePayoutRate(id: string, body: {
        rate_naira: number;
    }, user: any): Promise<any>;
    getSettings(): Promise<any>;
    updateSetting(key: string, body: {
        value: string;
    }, user: any): Promise<any>;
    listPayouts(status?: string): Promise<any[]>;
    approvePayout(id: string, user: any): Promise<any>;
    markPayoutPaid(id: string, user: any, body: {
        paystack_transfer_code: string;
    }): Promise<any>;
    listTransactions(status?: string, limit?: string, offset?: string): Promise<{
        transactions: any[];
        total: number;
    }>;
    getAuditLogs(actor_id?: string, action?: string, limit?: string): Promise<any[]>;
}

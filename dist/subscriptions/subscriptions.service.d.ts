import { SupabaseService } from '../common/supabase/supabase.service';
export declare class SubscriptionsService {
    private supabase;
    constructor(supabase: SupabaseService);
    getPlans(): ({
        name: string;
        price_monthly: number;
        price_yearly: number;
        consult_limit: number;
        id: string;
    } | {
        name: string;
        price_monthly: number;
        price_yearly: number;
        consult_limit: number;
        id: string;
    } | {
        name: string;
        price_monthly: number;
        price_yearly: number;
        consult_limit: number;
        id: string;
    })[];
    getMySubscription(userId: string): Promise<any>;
    subscribe(userId: string, dto: {
        plan: 'basic' | 'standard' | 'premium';
        billing_cycle: 'monthly' | 'yearly';
        payment_reference?: string;
    }): Promise<any>;
    cancelSubscription(userId: string): Promise<{
        message: string;
    }>;
    downgrade(userId: string, newPlan: 'basic' | 'standard'): Promise<{
        message: string;
        data: any;
    }>;
    getBillingHistory(userId: string): Promise<any[]>;
}

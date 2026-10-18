import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
export declare class PaymentsService {
    private supabase;
    private config;
    private readonly logger;
    private readonly paystackBase;
    constructor(supabase: SupabaseService, config: ConfigService);
    private get paystackHeaders();
    initializePayment(userId: string, dto: {
        amount: number;
        email: string;
        resource_type: 'consultation' | 'pharmacy_order' | 'lab_order' | 'subscription';
        resource_id: string;
        metadata?: Record<string, any>;
    }): Promise<{
        authorization_url: any;
        access_code: any;
        reference: string;
    }>;
    verifyPayment(reference: string): Promise<{
        message: string;
        amount: number;
    }>;
    handleWebhook(body: any, signature: string): Promise<{
        received: boolean;
    }>;
    private updateResourcePaymentStatus;
    private scheduleConsultationPayout;
    processPayout(payoutId: string): Promise<{
        message: string;
    }>;
    getMyEarnings(practitionerId: string): Promise<{
        payouts: any[];
        total_earned: any;
        pending_payout: any;
    }>;
}

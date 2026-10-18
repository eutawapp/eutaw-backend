import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    initializePayment(user: any, body: any): Promise<{
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
    getMyEarnings(user: any): Promise<{
        payouts: any[];
        total_earned: any;
        pending_payout: any;
    }>;
}

import { SubscriptionsService } from './subscriptions.service';
export declare class SubscriptionsController {
    private subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
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
    getMine(user: any): Promise<any>;
    getBilling(user: any): Promise<any[]>;
    subscribe(user: any, body: any): Promise<any>;
    cancel(user: any): Promise<{
        message: string;
    }>;
    downgrade(user: any, body: any): Promise<{
        message: string;
        data: any;
    }>;
}

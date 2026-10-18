import { SupabaseService } from '../common/supabase/supabase.service';
export declare class PharmacyService {
    private supabase;
    constructor(supabase: SupabaseService);
    createOrder(patientId: string, dto: {
        prescription_id?: string;
        pharmacist_id?: string;
        delivery_address: string;
        delivery_type: 'delivery' | 'pickup';
        items: Array<{
            drug_name: string;
            quantity: number;
            unit_price: number;
            instructions?: string;
        }>;
        notes?: string;
    }): Promise<any>;
    getPatientOrders(patientId: string, status?: string): Promise<any[]>;
    getPharmacistOrders(pharmacistId: string, status?: string): Promise<any[]>;
    getOrderById(orderId: string, userId: string, role: string): Promise<any>;
    acceptOrder(orderId: string, pharmacistId: string): Promise<any>;
    updateOrderStatus(orderId: string, pharmacistId: string, status: string, tracking_info?: string): Promise<any>;
}

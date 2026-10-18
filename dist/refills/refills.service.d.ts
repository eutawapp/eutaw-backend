import { SupabaseService } from '../common/supabase/supabase.service';
export declare class RefillsService {
    private supabase;
    constructor(supabase: SupabaseService);
    getMyRefills(patientId: string, status?: string): Promise<any[]>;
    getRefillById(refillId: string, patientId: string): Promise<any>;
    requestRefill(patientId: string, dto: {
        prescription_id: string;
        pharmacy_order_id?: string;
        notes?: string;
        delivery_address?: string;
        delivery_type?: 'delivery' | 'pickup';
    }): Promise<any>;
    cancelRefill(refillId: string, patientId: string): Promise<any>;
    getRefillablePresciptions(patientId: string): Promise<any[]>;
}

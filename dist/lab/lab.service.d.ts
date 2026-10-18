import { SupabaseService } from '../common/supabase/supabase.service';
export declare class LabService {
    private supabase;
    constructor(supabase: SupabaseService);
    createLabOrder(patientId: string, dto: {
        lab_tech_id?: string;
        test_names: string[];
        test_amounts: number[];
        sample_type: string;
        collection_type: 'home_collection' | 'walk_in';
        collection_address?: string;
        scheduled_at?: string;
        notes?: string;
        prescription_id?: string;
    }): Promise<any>;
    getOrders(userId: string, role: string, status?: string): Promise<any[]>;
    getOrderById(orderId: string, userId: string, role: string): Promise<any>;
    acceptOrder(orderId: string, labTechId: string): Promise<any>;
    updateOrderStatus(orderId: string, labTechId: string, dto: {
        status: string;
        result_summary?: string;
        result_file_url?: string;
        result_notes?: string;
    }): Promise<any>;
}

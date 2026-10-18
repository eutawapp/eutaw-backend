import { SupabaseService } from '../common/supabase/supabase.service';
export declare class SearchService {
    private supabase;
    constructor(supabase: SupabaseService);
    search(q: string, userId: string): Promise<{
        doctors: {
            user_id: any;
            specialty: any;
            consultation_fee: any;
            average_rating: any;
            users: {
                full_name: any;
                profile_photo_url: any;
                state: any;
            }[];
        }[];
        prescriptions: {
            drug_name: any;
            dosage: any;
            frequency: any;
            prescription: {
                id: any;
                status: any;
                created_at: any;
                doctor: {
                    users: {
                        full_name: any;
                    }[];
                }[];
            }[];
        }[];
        consultations: {
            id: any;
            symptoms: any;
            diagnosis: any;
            status: any;
            created_at: any;
            doctor: {
                users: {
                    full_name: any;
                }[];
            }[];
        }[];
        lab_orders: {
            id: any;
            test_names: any;
            status: any;
            created_at: any;
            result_summary: any;
        }[];
    }>;
    searchDoctors(q: string): Promise<{
        user_id: any;
        specialty: any;
        consultation_fee: any;
        average_rating: any;
        users: {
            full_name: any;
            profile_photo_url: any;
            state: any;
        }[];
    }[]>;
    searchPrescriptions(q: string, patientId: string): Promise<{
        drug_name: any;
        dosage: any;
        frequency: any;
        prescription: {
            id: any;
            status: any;
            created_at: any;
            doctor: {
                users: {
                    full_name: any;
                }[];
            }[];
        }[];
    }[]>;
    searchConsultations(q: string, patientId: string): Promise<{
        id: any;
        symptoms: any;
        diagnosis: any;
        status: any;
        created_at: any;
        doctor: {
            users: {
                full_name: any;
            }[];
        }[];
    }[]>;
    searchLabOrders(q: string, patientId: string): Promise<{
        id: any;
        test_names: any;
        status: any;
        created_at: any;
        result_summary: any;
    }[]>;
}

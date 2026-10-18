import { SearchService } from './search.service';
export declare class SearchController {
    private searchService;
    constructor(searchService: SearchService);
    search(q: string, user: any): Promise<{
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
}

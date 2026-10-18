import { SupabaseService } from '../common/supabase/supabase.service';
export declare class UsersService {
    private supabase;
    constructor(supabase: SupabaseService);
    getProfile(userId: string): Promise<{
        id: any;
        full_name: any;
        phone: any;
        email: any;
        role: any;
        state: any;
        gender: any;
        date_of_birth: any;
        profile_photo_url: any;
        is_verified: any;
        onboarding_done: any;
        created_at: any;
        patient_profiles: any[];
        practitioner_profiles: any[];
    }>;
    updateProfile(userId: string, updates: Record<string, any>): Promise<any>;
    updatePatientProfile(userId: string, updates: Record<string, any>): Promise<any>;
    getPractitionerProfile(userId: string): Promise<any>;
    updatePractitionerProfile(userId: string, updates: Record<string, any>): Promise<any>;
    getAvailableDoctors(params: {
        specialty?: string;
        state?: string;
        limit?: number;
    }): Promise<{
        user_id: any;
        specialty: any;
        years_experience: any;
        bio: any;
        consultation_fee: any;
        average_rating: any;
        total_reviews: any;
        languages: any;
        users: {
            full_name: any;
            profile_photo_url: any;
            state: any;
            is_verified: any;
        }[];
    }[]>;
    getDoctorReviews(doctorId: string): Promise<{
        id: any;
        rating: any;
        comment: any;
        created_at: any;
        patients: {
            users: {
                full_name: any;
            }[];
        }[];
    }[]>;
    getCareJourney(patientId: string): Promise<{
        timeline: any[];
    }>;
    uploadProfilePhoto(userId: string, file: Express.Multer.File): Promise<{
        profile_photo_url: string;
    }>;
    getNotificationPreferences(userId: string): Promise<any>;
    updateNotificationPreferences(userId: string, prefs: Record<string, boolean>): Promise<any>;
}

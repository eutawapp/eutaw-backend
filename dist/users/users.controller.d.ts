import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getMe(user: any): Promise<{
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
    updateMe(user: any, body: any): Promise<any>;
    updateHealthProfile(user: any, body: any): Promise<any>;
    uploadPhoto(user: any, file: Express.Multer.File): Promise<{
        profile_photo_url: string;
    }>;
    getCareJourney(user: any): Promise<{
        timeline: any[];
    }>;
    getNotifPrefs(user: any): Promise<any>;
    updateNotifPrefs(user: any, body: any): Promise<any>;
    getDoctors(query: any): Promise<{
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
    getDoctorReviews(id: string): Promise<{
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
    getUser(id: string): Promise<{
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
}

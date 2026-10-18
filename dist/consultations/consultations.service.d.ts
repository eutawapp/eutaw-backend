import { SupabaseService } from '../common/supabase/supabase.service';
export declare class ConsultationsService {
    private supabase;
    constructor(supabase: SupabaseService);
    createConsultation(patientId: string, dto: {
        doctor_id: string;
        symptoms: string;
        severity?: string;
        type?: string;
        scheduled_at?: string;
    }): Promise<any>;
    getMyConsultations(userId: string, role: string, status?: string): Promise<any[]>;
    getConsultationById(consultationId: string, userId: string): Promise<any>;
    acceptConsultation(consultationId: string, doctorId: string): Promise<any>;
    completeConsultation(consultationId: string, doctorId: string, dto: {
        doctor_notes?: string;
        diagnosis?: string;
        follow_up_date?: string;
    }): Promise<any>;
    sendMessage(consultationId: string, senderId: string, dto: {
        content: string;
        message_type?: string;
        file_url?: string;
    }): Promise<any>;
    rateConsultation(consultationId: string, patientId: string, dto: {
        rating: number;
        comment?: string;
    }): Promise<{
        message: string;
    }>;
    createPrescription(consultationId: string, doctorId: string, dto: {
        patient_id: string;
        items: Array<{
            drug_name: string;
            dosage: string;
            frequency: string;
            duration_days: number;
            instructions?: string;
        }>;
        notes?: string;
    }): Promise<any>;
    getPatientPrescriptions(patientId: string): Promise<any[]>;
}

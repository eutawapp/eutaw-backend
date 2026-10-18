import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
export declare class NotificationsService {
    private supabase;
    private config;
    private readonly logger;
    private firebaseApp;
    constructor(supabase: SupabaseService, config: ConfigService);
    private initFirebase;
    sendPush(userId: string, dto: {
        title: string;
        body: string;
        type: string;
        data?: Record<string, any>;
        resource_id?: string;
    }): Promise<any>;
    registerDevice(userId: string, dto: {
        fcm_token: string;
        device_type: string;
        device_model?: string;
    }): Promise<any>;
    getMyNotifications(userId: string, limit?: number, offset?: number): Promise<{
        notifications: any[];
        total: number;
    }>;
    markAsRead(userId: string, notificationIds: string[]): Promise<{
        message: string;
    }>;
    notifyNewConsultation(doctorId: string, patientName: string, consultationId: string): Promise<any>;
    notifyConsultationAccepted(patientId: string, doctorName: string, consultationId: string): Promise<any>;
    notifyOrderStatusUpdate(userId: string, orderRef: string, status: string, orderId: string): Promise<any>;
    notifyLabResultReady(patientId: string, orderId: string): Promise<any>;
}

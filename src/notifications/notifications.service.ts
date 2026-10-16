import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  // Send a push notification via Firebase FCM
  async sendPush(userId: string, dto: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
    resource_id?: string;
  }) {
    // Save notification to database
    const { data: notification } = await this.supabase.admin
      .from('notifications')
      .insert({
        user_id: userId,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        data: dto.data || {},
        resource_id: dto.resource_id,
      })
      .select()
      .single();

    // Get user's FCM token from device sessions
    const { data: sessions } = await this.supabase.admin
      .from('device_sessions')
      .select('fcm_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('fcm_token', 'is', null);

    if (!sessions || sessions.length === 0) return notification;

    const fcmTokens = sessions.map(s => s.fcm_token).filter(Boolean);

    // Send FCM notification
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    for (const token of fcmTokens) {
      try {
        await axios.post(
          fcmUrl,
          {
            message: {
              token,
              notification: { title: dto.title, body: dto.body },
              data: dto.data ? Object.fromEntries(
                Object.entries(dto.data).map(([k, v]) => [k, String(v)])
              ) : {},
              android: { priority: 'high' },
              apns: { payload: { aps: { sound: 'default' } } },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${await this.getFcmAccessToken()}`,
              'Content-Type': 'application/json',
            },
          },
        );
      } catch (err) {
        this.logger.error(`FCM push failed for token ${token.slice(0, 10)}...`, err.message);
      }
    }

    return notification;
  }

  // Register or update FCM token for user's device
  async registerDevice(userId: string, dto: {
    fcm_token: string;
    device_type: string;
    device_model?: string;
  }) {
    // Upsert by FCM token
    const { data, error } = await this.supabase.admin
      .from('device_sessions')
      .upsert({
        user_id: userId,
        fcm_token: dto.fcm_token,
        device_type: dto.device_type,
        device_model: dto.device_model,
        last_seen: new Date().toISOString(),
        is_active: true,
      }, { onConflict: 'fcm_token' })
      .select()
      .single();

    return data;
  }

  // Get user's notifications (paginated)
  async getMyNotifications(userId: string, limit = 20, offset = 0) {
    const { data, error, count } = await this.supabase.admin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { notifications: data, total: count };
  }

  // Mark notifications as read
  async markAsRead(userId: string, notificationIds: string[]) {
    await this.supabase.admin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', notificationIds);

    return { message: 'Marked as read.' };
  }

  // Helper: get Firebase access token (simplified — use service account in production)
  private async getFcmAccessToken(): Promise<string> {
    // In production, use google-auth-library with a service account JSON
    // For now, return a placeholder; set up proper auth before going live
    return this.config.get('FIREBASE_ACCESS_TOKEN', '');
  }

  // Convenience methods used by other services
  async notifyNewConsultation(doctorId: string, patientName: string, consultationId: string) {
    return this.sendPush(doctorId, {
      title: 'New Consultation Request',
      body: `${patientName} is requesting a consultation`,
      type: 'new_consultation',
      resource_id: consultationId,
    });
  }

  async notifyConsultationAccepted(patientId: string, doctorName: string, consultationId: string) {
    return this.sendPush(patientId, {
      title: 'Doctor Accepted',
      body: `Dr. ${doctorName} has accepted your consultation`,
      type: 'consultation_accepted',
      resource_id: consultationId,
    });
  }

  async notifyOrderStatusUpdate(userId: string, orderRef: string, status: string, orderId: string) {
    return this.sendPush(userId, {
      title: 'Order Update',
      body: `Your order ${orderRef} is now: ${status}`,
      type: 'order_status_update',
      resource_id: orderId,
    });
  }

  async notifyLabResultReady(patientId: string, orderId: string) {
    return this.sendPush(patientId, {
      title: 'Lab Results Ready',
      body: 'Your test results are now available. Tap to view.',
      type: 'lab_result_ready',
      resource_id: orderId,
    });
  }
}

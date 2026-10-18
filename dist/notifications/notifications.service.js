"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_service_1 = require("../common/supabase/supabase.service");
const admin = require("firebase-admin");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(supabase, config) {
        this.supabase = supabase;
        this.config = config;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.initFirebase();
    }
    initFirebase() {
        try {
            if (admin.apps.length > 0) {
                this.firebaseApp = admin.app();
                return;
            }
            const projectId = this.config.get('FIREBASE_PROJECT_ID');
            const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
            const privateKeyRaw = this.config.get('FIREBASE_PRIVATE_KEY');
            if (!projectId || !clientEmail || !privateKeyRaw) {
                this.logger.warn('Firebase credentials not configured — push notifications disabled');
                return;
            }
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
            this.firebaseApp = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            this.logger.log('Firebase Admin initialized');
        }
        catch (err) {
            this.logger.error('Firebase init failed', err.message);
        }
    }
    async sendPush(userId, dto) {
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
        const { data: sessions } = await this.supabase.admin
            .from('device_sessions')
            .select('fcm_token')
            .eq('user_id', userId)
            .eq('is_active', true)
            .not('fcm_token', 'is', null);
        if (!sessions || sessions.length === 0)
            return notification;
        const fcmTokens = sessions.map(s => s.fcm_token).filter(Boolean);
        for (const token of fcmTokens) {
            try {
                await this.firebaseApp.messaging().send({
                    token,
                    notification: { title: dto.title, body: dto.body },
                    data: dto.data
                        ? Object.fromEntries(Object.entries(dto.data).map(([k, v]) => [k, String(v)]))
                        : {},
                    android: { priority: 'high' },
                    apns: { payload: { aps: { sound: 'default' } } },
                });
            }
            catch (err) {
                this.logger.error(`FCM push failed for token ${token.slice(0, 10)}...`, err.message);
            }
        }
        return notification;
    }
    async registerDevice(userId, dto) {
        const { data } = await this.supabase.admin
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
    async getMyNotifications(userId, limit = 20, offset = 0) {
        const { data, count } = await this.supabase.admin
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        return { notifications: data, total: count };
    }
    async markAsRead(userId, notificationIds) {
        await this.supabase.admin
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .in('id', notificationIds);
        return { message: 'Marked as read.' };
    }
    async notifyNewConsultation(doctorId, patientName, consultationId) {
        return this.sendPush(doctorId, {
            title: 'New Consultation Request',
            body: `${patientName} is requesting a consultation`,
            type: 'new_consultation',
            resource_id: consultationId,
        });
    }
    async notifyConsultationAccepted(patientId, doctorName, consultationId) {
        return this.sendPush(patientId, {
            title: 'Doctor Accepted',
            body: `Dr. ${doctorName} has accepted your consultation`,
            type: 'consultation_accepted',
            resource_id: consultationId,
        });
    }
    async notifyOrderStatusUpdate(userId, orderRef, status, orderId) {
        return this.sendPush(userId, {
            title: 'Order Update',
            body: `Your order ${orderRef} is now: ${status}`,
            type: 'order_status_update',
            resource_id: orderId,
        });
    }
    async notifyLabResultReady(patientId, orderId) {
        return this.sendPush(patientId, {
            title: 'Lab Results Ready',
            body: 'Your test results are now available. Tap to view.',
            type: 'lab_result_ready',
            resource_id: orderId,
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map
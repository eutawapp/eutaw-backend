import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    registerDevice(user: any, body: any): Promise<any>;
    getMyNotifications(user: any, limit?: string, offset?: string): Promise<{
        notifications: any[];
        total: number;
    }>;
    markAsRead(user: any, body: {
        ids: string[];
    }): Promise<{
        message: string;
    }>;
}

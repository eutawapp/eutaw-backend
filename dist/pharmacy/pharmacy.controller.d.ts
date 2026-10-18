import { PharmacyService } from './pharmacy.service';
export declare class PharmacyController {
    private pharmacyService;
    constructor(pharmacyService: PharmacyService);
    createOrder(user: any, body: any): Promise<any>;
    getOrders(user: any, status?: string): Promise<any[]>;
    getOrderById(id: string, user: any): Promise<any>;
    acceptOrder(id: string, user: any): Promise<any>;
    updateOrderStatus(id: string, user: any, body: {
        status: string;
        tracking_info?: string;
    }): Promise<any>;
}

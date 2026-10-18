import { LabService } from './lab.service';
export declare class LabController {
    private labService;
    constructor(labService: LabService);
    createOrder(user: any, body: any): Promise<any>;
    getOrders(user: any, status?: string): Promise<any[]>;
    getOrderById(id: string, user: any): Promise<any>;
    acceptOrder(id: string, user: any): Promise<any>;
    updateOrderStatus(id: string, user: any, body: any): Promise<any>;
}

import { RefillsService } from './refills.service';
export declare class RefillsController {
    private refillsService;
    constructor(refillsService: RefillsService);
    getMyRefills(user: any, status?: string): Promise<any[]>;
    getEligible(user: any): Promise<any[]>;
    getRefill(id: string, user: any): Promise<any>;
    requestRefill(user: any, body: any): Promise<any>;
    cancelRefill(id: string, user: any): Promise<any>;
}

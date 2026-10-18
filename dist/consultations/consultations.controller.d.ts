import { ConsultationsService } from './consultations.service';
export declare class ConsultationsController {
    private consultationsService;
    constructor(consultationsService: ConsultationsService);
    createConsultation(user: any, body: any): Promise<any>;
    getMyConsultations(user: any, status?: string): Promise<any[]>;
    getConsultation(id: string, user: any): Promise<any>;
    acceptConsultation(id: string, user: any): Promise<any>;
    completeConsultation(id: string, user: any, body: any): Promise<any>;
    sendMessage(id: string, user: any, body: any): Promise<any>;
    rateConsultation(id: string, user: any, body: any): Promise<{
        message: string;
    }>;
    createPrescription(id: string, user: any, body: any): Promise<any>;
    getMyPrescriptions(user: any): Promise<any[]>;
}

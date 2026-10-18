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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../common/supabase/supabase.service");
let LabService = class LabService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async createLabOrder(patientId, dto) {
        const totalAmount = dto.test_amounts.reduce((sum, a) => sum + a, 0);
        const collectionFee = dto.collection_type === 'home_collection' ? 2000 : 0;
        const { data: order, error } = await this.supabase.admin
            .from('lab_orders')
            .insert({
            patient_id: patientId,
            lab_tech_id: dto.lab_tech_id,
            prescription_id: dto.prescription_id,
            test_names: dto.test_names,
            test_amounts: dto.test_amounts,
            total_amount: totalAmount + collectionFee,
            collection_fee: collectionFee,
            sample_type: dto.sample_type,
            collection_type: dto.collection_type,
            collection_address: dto.collection_address,
            scheduled_at: dto.scheduled_at,
            notes: dto.notes,
            status: 'pending',
            payment_status: 'pending',
        })
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to create lab order.');
        return order;
    }
    async getOrders(userId, role, status) {
        let query = this.supabase.admin
            .from('lab_orders')
            .select(`
        *,
        patient:patient_id(users!inner(full_name, phone)),
        lab_tech:lab_tech_id(users!inner(full_name, phone))
      `);
        if (role === 'patient') {
            query = query.eq('patient_id', userId);
        }
        else if (role === 'lab_tech') {
            query = query.or(`lab_tech_id.eq.${userId},lab_tech_id.is.null`);
        }
        if (status)
            query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch lab orders.');
        return data;
    }
    async getOrderById(orderId, userId, role) {
        const { data, error } = await this.supabase.admin
            .from('lab_orders')
            .select('*')
            .eq('id', orderId)
            .single();
        if (error || !data)
            throw new common_1.NotFoundException('Lab order not found.');
        if (role === 'patient' && data.patient_id !== userId) {
            throw new common_1.ForbiddenException('Access denied.');
        }
        if (role === 'lab_tech' && data.lab_tech_id && data.lab_tech_id !== userId) {
            throw new common_1.ForbiddenException('Access denied.');
        }
        return data;
    }
    async acceptOrder(orderId, labTechId) {
        const { data, error } = await this.supabase.admin
            .from('lab_orders')
            .update({ lab_tech_id: labTechId, status: 'sample_collection' })
            .eq('id', orderId)
            .eq('status', 'pending')
            .select()
            .single();
        if (error || !data)
            throw new common_1.BadRequestException('Order not available to claim.');
        return data;
    }
    async updateOrderStatus(orderId, labTechId, dto) {
        const allowed = ['sample_collection', 'processing', 'completed', 'cancelled'];
        if (!allowed.includes(dto.status))
            throw new common_1.BadRequestException('Invalid status.');
        const update = {
            status: dto.status,
            result_summary: dto.result_summary,
            result_file_url: dto.result_file_url,
            result_notes: dto.result_notes,
        };
        if (dto.status === 'completed') {
            update.result_released_at = new Date().toISOString();
        }
        const { data, error } = await this.supabase.admin
            .from('lab_orders')
            .update(update)
            .eq('id', orderId)
            .eq('lab_tech_id', labTechId)
            .select()
            .single();
        if (error || !data)
            throw new common_1.BadRequestException('Failed to update lab order.');
        return data;
    }
};
exports.LabService = LabService;
exports.LabService = LabService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], LabService);
//# sourceMappingURL=lab.service.js.map
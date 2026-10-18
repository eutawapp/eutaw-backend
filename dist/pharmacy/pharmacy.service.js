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
exports.PharmacyService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../common/supabase/supabase.service");
let PharmacyService = class PharmacyService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async createOrder(patientId, dto) {
        const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
        const deliveryFee = dto.delivery_type === 'delivery' ? 500 : 0;
        const { data: order, error } = await this.supabase.admin
            .from('pharmacy_orders')
            .insert({
            patient_id: patientId,
            prescription_id: dto.prescription_id,
            pharmacist_id: dto.pharmacist_id,
            delivery_address: dto.delivery_address,
            delivery_type: dto.delivery_type,
            total_amount: totalAmount + deliveryFee,
            delivery_fee: deliveryFee,
            notes: dto.notes,
            status: 'pending',
            payment_status: 'pending',
        })
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to create order.');
        const items = dto.items.map(item => ({
            ...item,
            order_id: order.id,
            subtotal: item.quantity * item.unit_price,
        }));
        await this.supabase.admin.from('pharmacy_order_items').insert(items);
        return { ...order, items };
    }
    async getPatientOrders(patientId, status) {
        let query = this.supabase.admin
            .from('pharmacy_orders')
            .select(`
        *,
        pharmacy_order_items(*),
        pharmacist:pharmacist_id(users!inner(full_name, phone))
      `)
            .eq('patient_id', patientId);
        if (status)
            query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch orders.');
        return data;
    }
    async getPharmacistOrders(pharmacistId, status) {
        let query = this.supabase.admin
            .from('pharmacy_orders')
            .select(`
        *,
        pharmacy_order_items(*),
        patient:patient_id(users!inner(full_name, phone))
      `)
            .or(`pharmacist_id.eq.${pharmacistId},pharmacist_id.is.null`);
        if (status)
            query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch orders.');
        return data;
    }
    async getOrderById(orderId, userId, role) {
        const { data, error } = await this.supabase.admin
            .from('pharmacy_orders')
            .select(`*, pharmacy_order_items(*)`)
            .eq('id', orderId)
            .single();
        if (error || !data)
            throw new common_1.NotFoundException('Order not found.');
        if (role === 'patient' && data.patient_id !== userId) {
            throw new common_1.ForbiddenException('Access denied.');
        }
        if (role === 'pharmacist' && data.pharmacist_id && data.pharmacist_id !== userId) {
            throw new common_1.ForbiddenException('Access denied.');
        }
        return data;
    }
    async acceptOrder(orderId, pharmacistId) {
        const { data, error } = await this.supabase.admin
            .from('pharmacy_orders')
            .update({ pharmacist_id: pharmacistId, status: 'processing' })
            .eq('id', orderId)
            .eq('status', 'pending')
            .is('pharmacist_id', null)
            .select()
            .single();
        if (error || !data)
            throw new common_1.BadRequestException('Order not available to claim.');
        return data;
    }
    async updateOrderStatus(orderId, pharmacistId, status, tracking_info) {
        const allowed = ['processing', 'ready', 'dispatched', 'delivered'];
        if (!allowed.includes(status))
            throw new common_1.BadRequestException('Invalid status.');
        const { data, error } = await this.supabase.admin
            .from('pharmacy_orders')
            .update({
            status,
            tracking_info,
            ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
        })
            .eq('id', orderId)
            .eq('pharmacist_id', pharmacistId)
            .select()
            .single();
        if (error || !data)
            throw new common_1.BadRequestException('Failed to update order status.');
        return data;
    }
};
exports.PharmacyService = PharmacyService;
exports.PharmacyService = PharmacyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], PharmacyService);
//# sourceMappingURL=pharmacy.service.js.map
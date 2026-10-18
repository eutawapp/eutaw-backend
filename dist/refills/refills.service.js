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
exports.RefillsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../common/supabase/supabase.service");
let RefillsService = class RefillsService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async getMyRefills(patientId, status) {
        let query = this.supabase.admin
            .from('prescription_refills')
            .select(`
        *,
        prescription:prescription_id(
          *,
          prescription_items(*),
          doctor:doctor_id(users!inner(full_name), practitioner_profiles(specialty))
        )
      `)
            .eq('patient_id', patientId);
        if (status)
            query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch refills.');
        return data;
    }
    async getRefillById(refillId, patientId) {
        const { data, error } = await this.supabase.admin
            .from('prescription_refills')
            .select(`
        *,
        prescription:prescription_id(*, prescription_items(*))
      `)
            .eq('id', refillId)
            .eq('patient_id', patientId)
            .single();
        if (error || !data)
            throw new common_1.NotFoundException('Refill not found.');
        return data;
    }
    async requestRefill(patientId, dto) {
        const { data: rx } = await this.supabase.admin
            .from('prescriptions')
            .select('id, status, refills_remaining')
            .eq('id', dto.prescription_id)
            .eq('patient_id', patientId)
            .single();
        if (!rx)
            throw new common_1.NotFoundException('Prescription not found.');
        if (rx.status !== 'active')
            throw new common_1.BadRequestException('Prescription is no longer active.');
        if (rx.refills_remaining !== null && rx.refills_remaining <= 0) {
            throw new common_1.BadRequestException('No refills remaining on this prescription.');
        }
        const { data, error } = await this.supabase.admin
            .from('prescription_refills')
            .insert({
            patient_id: patientId,
            prescription_id: dto.prescription_id,
            notes: dto.notes,
            delivery_address: dto.delivery_address,
            delivery_type: dto.delivery_type || 'delivery',
            status: 'pending',
        })
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to request refill.');
        if (rx.refills_remaining !== null) {
            await this.supabase.admin
                .from('prescriptions')
                .update({ refills_remaining: rx.refills_remaining - 1 })
                .eq('id', dto.prescription_id);
        }
        return data;
    }
    async cancelRefill(refillId, patientId) {
        const { data, error } = await this.supabase.admin
            .from('prescription_refills')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', refillId)
            .eq('patient_id', patientId)
            .eq('status', 'pending')
            .select()
            .single();
        if (error || !data)
            throw new common_1.BadRequestException('Refill cannot be cancelled.');
        return data;
    }
    async getRefillablePresciptions(patientId) {
        const { data, error } = await this.supabase.admin
            .from('prescriptions')
            .select(`
        *,
        prescription_items(*),
        doctor:doctor_id(users!inner(full_name))
      `)
            .eq('patient_id', patientId)
            .eq('status', 'active')
            .or('refills_remaining.is.null,refills_remaining.gt.0')
            .order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch prescriptions.');
        return data;
    }
};
exports.RefillsService = RefillsService;
exports.RefillsService = RefillsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], RefillsService);
//# sourceMappingURL=refills.service.js.map
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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../common/supabase/supabase.service");
let SearchService = class SearchService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async search(q, userId) {
        if (!q || q.trim().length < 2)
            throw new common_1.BadRequestException('Query too short.');
        const query = q.trim().toLowerCase();
        const [doctors, prescriptions, consultations, labOrders] = await Promise.all([
            this.searchDoctors(query),
            this.searchPrescriptions(query, userId),
            this.searchConsultations(query, userId),
            this.searchLabOrders(query, userId),
        ]);
        return { doctors, prescriptions, consultations, lab_orders: labOrders };
    }
    async searchDoctors(q) {
        const { data } = await this.supabase.admin
            .from('practitioner_profiles')
            .select(`
        user_id, specialty, consultation_fee, average_rating,
        users!inner(full_name, profile_photo_url, state)
      `)
            .or(`specialty.ilike.%${q}%,users.full_name.ilike.%${q}%`)
            .eq('users.role', 'doctor')
            .eq('available_for_consult', true)
            .limit(10);
        return data || [];
    }
    async searchPrescriptions(q, patientId) {
        const { data } = await this.supabase.admin
            .from('prescription_items')
            .select(`
        drug_name, dosage, frequency,
        prescription:prescription_id(
          id, status, created_at,
          doctor:doctor_id(users!inner(full_name))
        )
      `)
            .ilike('drug_name', `%${q}%`)
            .eq('prescription.patient_id', patientId)
            .limit(10);
        return data || [];
    }
    async searchConsultations(q, patientId) {
        const { data } = await this.supabase.admin
            .from('consultations')
            .select(`
        id, symptoms, diagnosis, status, created_at,
        doctor:doctor_id(users!inner(full_name))
      `)
            .eq('patient_id', patientId)
            .or(`symptoms.ilike.%${q}%,diagnosis.ilike.%${q}%`)
            .limit(10);
        return data || [];
    }
    async searchLabOrders(q, patientId) {
        const { data } = await this.supabase.admin
            .from('lab_orders')
            .select('id, test_names, status, created_at, result_summary')
            .eq('patient_id', patientId)
            .contains('test_names', [q])
            .limit(10);
        return data || [];
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], SearchService);
//# sourceMappingURL=search.service.js.map
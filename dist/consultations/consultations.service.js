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
exports.ConsultationsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../common/supabase/supabase.service");
let ConsultationsService = class ConsultationsService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async createConsultation(patientId, dto) {
        const { data: doctor } = await this.supabase.admin
            .from('practitioner_profiles')
            .select('consultation_fee, available_for_consult')
            .eq('user_id', dto.doctor_id)
            .single();
        if (!doctor || !doctor.available_for_consult) {
            throw new common_1.BadRequestException('Doctor is not available for consultation.');
        }
        const { data, error } = await this.supabase.admin
            .from('consultations')
            .insert({
            patient_id: patientId,
            doctor_id: dto.doctor_id,
            symptoms: dto.symptoms,
            severity: dto.severity || 'mild',
            type: dto.type || 'chat',
            amount: doctor.consultation_fee,
            scheduled_at: dto.scheduled_at,
            status: 'pending',
            payment_status: 'pending',
        })
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to create consultation.');
        return data;
    }
    async getMyConsultations(userId, role, status) {
        let query = this.supabase.admin
            .from('consultations')
            .select(`
        *,
        patient:patient_id(users!inner(full_name, profile_photo_url, phone)),
        doctor:doctor_id(users!inner(full_name, profile_photo_url),
          practitioner_profiles(specialty, average_rating))
      `);
        if (role === 'patient') {
            query = query.eq('patient_id', userId);
        }
        else if (role === 'doctor') {
            query = query.eq('doctor_id', userId);
        }
        if (status)
            query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch consultations.');
        return data;
    }
    async getConsultationById(consultationId, userId) {
        const { data, error } = await this.supabase.admin
            .from('consultations')
            .select(`
        *,
        patient:patient_id(users!inner(full_name, profile_photo_url, phone),
          patient_profiles(blood_group, genotype, allergies, chronic_conditions)),
        doctor:doctor_id(users!inner(full_name, profile_photo_url),
          practitioner_profiles(specialty, years_experience, medical_license_number)),
        consultation_messages(*)
      `)
            .eq('id', consultationId)
            .single();
        if (error || !data)
            throw new common_1.NotFoundException('Consultation not found.');
        if (data.patient_id !== userId && data.doctor_id !== userId) {
            throw new common_1.ForbiddenException('Access denied.');
        }
        return data;
    }
    async acceptConsultation(consultationId, doctorId) {
        const { data: consult } = await this.supabase.admin
            .from('consultations')
            .select('*')
            .eq('id', consultationId)
            .eq('doctor_id', doctorId)
            .single();
        if (!consult)
            throw new common_1.NotFoundException('Consultation not found.');
        if (consult.status !== 'pending') {
            throw new common_1.BadRequestException('Consultation is not in pending status.');
        }
        if (consult.payment_status !== 'paid') {
            throw new common_1.BadRequestException('Patient has not paid for this consultation.');
        }
        const { data, error } = await this.supabase.admin
            .from('consultations')
            .update({ status: 'active', started_at: new Date().toISOString() })
            .eq('id', consultationId)
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to accept consultation.');
        return data;
    }
    async completeConsultation(consultationId, doctorId, dto) {
        const { data, error } = await this.supabase.admin
            .from('consultations')
            .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            doctor_notes: dto.doctor_notes,
            diagnosis: dto.diagnosis,
            follow_up_date: dto.follow_up_date,
        })
            .eq('id', consultationId)
            .eq('doctor_id', doctorId)
            .eq('status', 'active')
            .select()
            .single();
        if (error || !data)
            throw new common_1.BadRequestException('Failed to complete consultation.');
        return data;
    }
    async sendMessage(consultationId, senderId, dto) {
        const { data: consult } = await this.supabase.admin
            .from('consultations')
            .select('patient_id, doctor_id, status')
            .eq('id', consultationId)
            .single();
        if (!consult)
            throw new common_1.NotFoundException('Consultation not found.');
        if (consult.patient_id !== senderId && consult.doctor_id !== senderId) {
            throw new common_1.ForbiddenException('Not a participant in this consultation.');
        }
        if (consult.status !== 'active') {
            throw new common_1.BadRequestException('Consultation is not active.');
        }
        const { data, error } = await this.supabase.admin
            .from('consultation_messages')
            .insert({
            consultation_id: consultationId,
            sender_id: senderId,
            content: dto.content,
            message_type: dto.message_type || 'text',
            file_url: dto.file_url,
        })
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to send message.');
        return data;
    }
    async rateConsultation(consultationId, patientId, dto) {
        const { data: consult } = await this.supabase.admin
            .from('consultations')
            .select('patient_id, doctor_id, status')
            .eq('id', consultationId)
            .eq('patient_id', patientId)
            .single();
        if (!consult)
            throw new common_1.NotFoundException('Consultation not found.');
        if (consult.status !== 'completed') {
            throw new common_1.BadRequestException('Can only rate completed consultations.');
        }
        const { error: reviewError } = await this.supabase.admin
            .from('practitioner_reviews')
            .insert({
            practitioner_id: consult.doctor_id,
            patient_id: patientId,
            consultation_id: consultationId,
            rating: dto.rating,
            comment: dto.comment,
        });
        if (reviewError)
            throw new common_1.BadRequestException('Failed to submit rating.');
        const { data: reviews } = await this.supabase.admin
            .from('practitioner_reviews')
            .select('rating')
            .eq('practitioner_id', consult.doctor_id);
        if (reviews) {
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            await this.supabase.admin
                .from('practitioner_profiles')
                .update({ average_rating: Math.round(avg * 10) / 10, total_reviews: reviews.length })
                .eq('user_id', consult.doctor_id);
        }
        return { message: 'Rating submitted successfully.' };
    }
    async createPrescription(consultationId, doctorId, dto) {
        const { data: prescription, error } = await this.supabase.admin
            .from('prescriptions')
            .insert({
            consultation_id: consultationId,
            doctor_id: doctorId,
            patient_id: dto.patient_id,
            notes: dto.notes,
            status: 'active',
        })
            .select()
            .single();
        if (error)
            throw new common_1.BadRequestException('Failed to create prescription.');
        const items = dto.items.map(item => ({
            ...item,
            prescription_id: prescription.id,
        }));
        const { error: itemsError } = await this.supabase.admin
            .from('prescription_items')
            .insert(items);
        if (itemsError)
            throw new common_1.BadRequestException('Failed to add prescription items.');
        return { ...prescription, items };
    }
    async getPatientPrescriptions(patientId) {
        const { data, error } = await this.supabase.admin
            .from('prescriptions')
            .select(`
        *,
        prescription_items(*),
        doctor:doctor_id(users!inner(full_name), practitioner_profiles(specialty))
      `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });
        if (error)
            throw new common_1.BadRequestException('Failed to fetch prescriptions.');
        return data;
    }
};
exports.ConsultationsService = ConsultationsService;
exports.ConsultationsService = ConsultationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ConsultationsService);
//# sourceMappingURL=consultations.service.js.map
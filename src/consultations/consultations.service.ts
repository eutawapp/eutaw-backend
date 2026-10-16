import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class ConsultationsService {
  constructor(private supabase: SupabaseService) {}

  // Patient: create a new consultation request
  async createConsultation(patientId: string, dto: {
    doctor_id: string;
    symptoms: string;
    severity?: string;
    type?: string;
    scheduled_at?: string;
  }) {
    // Get doctor's consultation fee
    const { data: doctor } = await this.supabase.admin
      .from('practitioner_profiles')
      .select('consultation_fee, available_for_consult')
      .eq('user_id', dto.doctor_id)
      .single();

    if (!doctor || !doctor.available_for_consult) {
      throw new BadRequestException('Doctor is not available for consultation.');
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

    if (error) throw new BadRequestException('Failed to create consultation.');
    return data;
  }

  // Get consultations for current user (patient sees theirs, doctor sees theirs)
  async getMyConsultations(userId: string, role: string, status?: string) {
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
    } else if (role === 'doctor') {
      query = query.eq('doctor_id', userId);
    }

    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new BadRequestException('Failed to fetch consultations.');
    return data;
  }

  async getConsultationById(consultationId: string, userId: string) {
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

    if (error || !data) throw new NotFoundException('Consultation not found.');

    // Ensure user is a participant
    if (data.patient_id !== userId && data.doctor_id !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return data;
  }

  // Doctor: accept a pending consultation
  async acceptConsultation(consultationId: string, doctorId: string) {
    const { data: consult } = await this.supabase.admin
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .eq('doctor_id', doctorId)
      .single();

    if (!consult) throw new NotFoundException('Consultation not found.');
    if (consult.status !== 'pending') {
      throw new BadRequestException('Consultation is not in pending status.');
    }
    if (consult.payment_status !== 'paid') {
      throw new BadRequestException('Patient has not paid for this consultation.');
    }

    const { data, error } = await this.supabase.admin
      .from('consultations')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', consultationId)
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to accept consultation.');
    return data;
  }

  // Doctor: complete a consultation and add notes
  async completeConsultation(consultationId: string, doctorId: string, dto: {
    doctor_notes?: string;
    diagnosis?: string;
    follow_up_date?: string;
  }) {
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

    if (error || !data) throw new BadRequestException('Failed to complete consultation.');
    return data;
  }

  // Send a message in a consultation chat
  async sendMessage(consultationId: string, senderId: string, dto: {
    content: string;
    message_type?: string;
    file_url?: string;
  }) {
    // Verify sender is part of this consultation
    const { data: consult } = await this.supabase.admin
      .from('consultations')
      .select('patient_id, doctor_id, status')
      .eq('id', consultationId)
      .single();

    if (!consult) throw new NotFoundException('Consultation not found.');
    if (consult.patient_id !== senderId && consult.doctor_id !== senderId) {
      throw new ForbiddenException('Not a participant in this consultation.');
    }
    if (consult.status !== 'active') {
      throw new BadRequestException('Consultation is not active.');
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

    if (error) throw new BadRequestException('Failed to send message.');
    return data;
  }

  // Patient: rate doctor after consultation
  async rateConsultation(consultationId: string, patientId: string, dto: {
    rating: number;
    comment?: string;
  }) {
    const { data: consult } = await this.supabase.admin
      .from('consultations')
      .select('patient_id, doctor_id, status')
      .eq('id', consultationId)
      .eq('patient_id', patientId)
      .single();

    if (!consult) throw new NotFoundException('Consultation not found.');
    if (consult.status !== 'completed') {
      throw new BadRequestException('Can only rate completed consultations.');
    }

    // Create review
    const { error: reviewError } = await this.supabase.admin
      .from('practitioner_reviews')
      .insert({
        practitioner_id: consult.doctor_id,
        patient_id: patientId,
        consultation_id: consultationId,
        rating: dto.rating,
        comment: dto.comment,
      });

    if (reviewError) throw new BadRequestException('Failed to submit rating.');

    // Update doctor's average rating
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

  // Write a prescription for a consultation
  async createPrescription(consultationId: string, doctorId: string, dto: {
    patient_id: string;
    items: Array<{
      drug_name: string;
      dosage: string;
      frequency: string;
      duration_days: number;
      instructions?: string;
    }>;
    notes?: string;
  }) {
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

    if (error) throw new BadRequestException('Failed to create prescription.');

    // Insert prescription items
    const items = dto.items.map(item => ({
      ...item,
      prescription_id: prescription.id,
    }));

    const { error: itemsError } = await this.supabase.admin
      .from('prescription_items')
      .insert(items);

    if (itemsError) throw new BadRequestException('Failed to add prescription items.');

    return { ...prescription, items };
  }

  async getPatientPrescriptions(patientId: string) {
    const { data, error } = await this.supabase.admin
      .from('prescriptions')
      .select(`
        *,
        prescription_items(*),
        doctor:doctor_id(users!inner(full_name), practitioner_profiles(specialty))
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('Failed to fetch prescriptions.');
    return data;
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class SearchService {
  constructor(private supabase: SupabaseService) {}

  async search(q: string, userId: string) {
    if (!q || q.trim().length < 2) throw new BadRequestException('Query too short.');
    const query = q.trim().toLowerCase();

    const [doctors, prescriptions, consultations, labOrders] = await Promise.all([
      this.searchDoctors(query),
      this.searchPrescriptions(query, userId),
      this.searchConsultations(query, userId),
      this.searchLabOrders(query, userId),
    ]);

    return { doctors, prescriptions, consultations, lab_orders: labOrders };
  }

  async searchDoctors(q: string) {
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

  async searchPrescriptions(q: string, patientId: string) {
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

  async searchConsultations(q: string, patientId: string) {
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

  async searchLabOrders(q: string, patientId: string) {
    const { data } = await this.supabase.admin
      .from('lab_orders')
      .select('id, test_names, status, created_at, result_summary')
      .eq('patient_id', patientId)
      .contains('test_names', [q]) // array contains
      .limit(10);
    return data || [];
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class PatientsService {
  constructor(private supabase: SupabaseService) {}

  // ── KYC ──────────────────────────────────────────────────────

  async submitKyc(userId: string, dto: any) {
    const {
      full_name,
      date_of_birth,
      gender,
      phone,
      address,
      identity,
      emergency_contact,
      health,
      confirmed_at,
    } = dto;

    // Update users table with basic fields
    const userUpdates: Record<string, any> = {};
    if (full_name) userUpdates.full_name = full_name;
    if (gender) userUpdates.gender = gender;
    if (date_of_birth) userUpdates.date_of_birth = date_of_birth;
    if (phone) userUpdates.phone = phone;

    if (Object.keys(userUpdates).length > 0) {
      await this.supabase.admin
        .from('users')
        .update({ ...userUpdates, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }

    // Upsert patient_profiles with health / emergency contact fields
    const profileUpdates: Record<string, any> = {};
    if (health?.blood_group) profileUpdates.blood_group = health.blood_group;
    if (health?.genotype) profileUpdates.genotype = health.genotype;
    if (health?.allergies) profileUpdates.allergies = health.allergies;
    if (health?.chronic_conditions) profileUpdates.chronic_conditions = health.chronic_conditions;
    if (emergency_contact?.name) profileUpdates.emergency_contact_name = emergency_contact.name;
    if (emergency_contact?.phone) profileUpdates.emergency_contact_phone = emergency_contact.phone;

    if (Object.keys(profileUpdates).length > 0) {
      await this.supabase.admin
        .from('patient_profiles')
        .update({ ...profileUpdates, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    // Upsert patient_kyc record
    const kycPayload: Record<string, any> = {
      patient_id: userId,
      kyc_status: 'submitted',
      updated_at: new Date().toISOString(),
    };
    if (address) kycPayload.address = typeof address === 'string' ? address : JSON.stringify(address);
    if (identity) kycPayload.identity = typeof identity === 'string' ? identity : JSON.stringify(identity);
    if (confirmed_at) kycPayload.confirmed_at = confirmed_at;

    const { data: kyc, error: kycError } = await this.supabase.admin
      .from('patient_kyc')
      .upsert(kycPayload, { onConflict: 'patient_id' })
      .select()
      .single();

    if (kycError) throw new BadRequestException('Failed to save KYC: ' + kycError.message);

    // Mark onboarding done
    await this.supabase.admin
      .from('users')
      .update({ onboarding_done: true, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return { kyc_status: kyc.kyc_status, message: 'KYC submitted successfully.' };
  }

  async getKyc(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('patient_kyc')
      .select('kyc_status, address, identity, confirmed_at, created_at, updated_at')
      .eq('patient_id', userId)
      .single();

    if (error || !data) {
      // No KYC record yet — return pending status
      return { kyc_status: 'pending' };
    }

    return { kyc_status: data.kyc_status, data };
  }

  // ── MEDICAL HISTORY ───────────────────────────────────────────

  async getHistory(userId: string) {
    // History lives in patient_profiles (blood_group, genotype, allergies,
    // chronic_conditions) plus consultations with diagnoses.
    const [profileResult, consultationsResult] = await Promise.all([
      this.supabase.admin
        .from('patient_profiles')
        .select('blood_group, genotype, allergies, chronic_conditions, weight_kg, height_cm')
        .eq('user_id', userId)
        .single(),
      this.supabase.admin
        .from('consultations')
        .select('id, diagnosis, doctor_notes, created_at, doctor:doctor_id(users!inner(full_name))')
        .eq('patient_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return {
      profile: profileResult.data || {},
      past_diagnoses: consultationsResult.data || [],
    };
  }

  async updateHistory(userId: string, dto: any) {
    const allowed = [
      'blood_group', 'genotype', 'allergies', 'chronic_conditions',
      'weight_kg', 'height_cm',
    ];
    const filtered = Object.fromEntries(
      Object.entries(dto).filter(([k]) => allowed.includes(k)),
    );

    if (Object.keys(filtered).length === 0) {
      throw new BadRequestException('No valid fields to update.');
    }

    const { data, error } = await this.supabase.admin
      .from('patient_profiles')
      .update({ ...filtered, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to update history: ' + error.message);
    return data;
  }

  // ── VITALS ───────────────────────────────────────────────────

  async getVitals(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(50);

    if (error) throw new BadRequestException('Failed to fetch vitals: ' + error.message);
    return data || [];
  }

  async addVital(userId: string, dto: any) {
    const allowed = [
      'vital_type', 'value', 'unit', 'recorded_at', 'notes',
      'systolic', 'diastolic',
    ];
    const filtered = Object.fromEntries(
      Object.entries(dto).filter(([k]) => allowed.includes(k)),
    );

    if (!filtered.vital_type) {
      throw new BadRequestException('vital_type is required.');
    }

    const { data, error } = await this.supabase.admin
      .from('patient_vitals')
      .insert({
        patient_id: userId,
        ...filtered,
        recorded_at: filtered.recorded_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to save vital: ' + error.message);
    return data;
  }

  async deleteVital(userId: string, vitalId: string) {
    // Verify ownership first
    const { data: vital } = await this.supabase.admin
      .from('patient_vitals')
      .select('patient_id')
      .eq('id', vitalId)
      .single();

    if (!vital) throw new NotFoundException('Vital record not found.');
    if (vital.patient_id !== userId) throw new ForbiddenException('Not your vital record.');

    const { error } = await this.supabase.admin
      .from('patient_vitals')
      .delete()
      .eq('id', vitalId);

    if (error) throw new BadRequestException('Failed to delete vital: ' + error.message);
    return { message: 'Vital record deleted.' };
  }
}

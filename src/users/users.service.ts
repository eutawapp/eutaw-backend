import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select(`
        id, full_name, phone, email, role, state, gender,
        date_of_birth, profile_photo_url, is_verified,
        onboarding_done, created_at,
        patient_profiles(*),
        practitioner_profiles(*)
      `)
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundException('User not found.');
    return data;
  }

  async updateProfile(userId: string, updates: Record<string, any>) {
    // Only allow safe fields to be updated
    const allowed = ['full_name', 'email', 'state', 'gender', 'date_of_birth', 'profile_photo_url'];
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k)),
    );

    const { data, error } = await this.supabase.admin
      .from('users')
      .update({ ...filtered, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to update profile.');
    return data;
  }

  async updatePatientProfile(userId: string, updates: Record<string, any>) {
    const allowed = ['blood_group', 'genotype', 'allergies', 'chronic_conditions',
                     'emergency_contact_name', 'emergency_contact_phone',
                     'weight_kg', 'height_cm'];
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k)),
    );

    const { data, error } = await this.supabase.admin
      .from('patient_profiles')
      .update({ ...filtered, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to update health profile.');
    return data;
  }

  async getPractitionerProfile(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('practitioner_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Practitioner profile not found.');
    return data;
  }

  async updatePractitionerProfile(userId: string, updates: Record<string, any>) {
    const allowed = ['specialty', 'years_experience', 'bio', 'consultation_fee',
                     'available_for_consult', 'languages', 'hospital_name',
                     'hospital_address', 'medical_license_number'];
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k)),
    );

    // Upsert practitioner profile
    const { data, error } = await this.supabase.admin
      .from('practitioner_profiles')
      .upsert({ user_id: userId, ...filtered, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to update practitioner profile.');
    return data;
  }

  async getAvailableDoctors(params: { specialty?: string; state?: string; limit?: number }) {
    let query = this.supabase.admin
      .from('practitioner_profiles')
      .select(`
        user_id, specialty, years_experience, bio, consultation_fee,
        average_rating, total_reviews, languages,
        users!inner(full_name, profile_photo_url, state, is_verified)
      `)
      .eq('available_for_consult', true)
      .eq('users.role', 'doctor')
      .eq('users.is_active', true)
      .eq('users.is_verified', true);

    if (params.specialty) query = query.eq('specialty', params.specialty);
    if (params.state) query = query.eq('users.state', params.state);

    const { data, error } = await query
      .order('average_rating', { ascending: false })
      .limit(params.limit || 20);

    if (error) throw new BadRequestException('Failed to fetch doctors.');
    return data;
  }

  async getDoctorReviews(doctorId: string) {
    const { data, error } = await this.supabase.admin
      .from('practitioner_reviews')
      .select(`
        id, rating, comment, created_at,
        patients:patient_id(users!inner(full_name))
      `)
      .eq('practitioner_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new BadRequestException('Failed to fetch reviews.');
    return data;
  }
}

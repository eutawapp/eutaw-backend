import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class RefillsService {
  constructor(private supabase: SupabaseService) {}

  async getMyRefills(patientId: string, status?: string) {
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

    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new BadRequestException('Failed to fetch refills.');
    return data;
  }

  async getRefillById(refillId: string, patientId: string) {
    const { data, error } = await this.supabase.admin
      .from('prescription_refills')
      .select(`
        *,
        prescription:prescription_id(*, prescription_items(*))
      `)
      .eq('id', refillId)
      .eq('patient_id', patientId)
      .single();

    if (error || !data) throw new NotFoundException('Refill not found.');
    return data;
  }

  async requestRefill(patientId: string, dto: {
    prescription_id: string;
    pharmacy_order_id?: string;
    notes?: string;
    delivery_address?: string;
    delivery_type?: 'delivery' | 'pickup';
  }) {
    // Verify prescription belongs to patient
    const { data: rx } = await this.supabase.admin
      .from('prescriptions')
      .select('id, status, refills_remaining')
      .eq('id', dto.prescription_id)
      .eq('patient_id', patientId)
      .single();

    if (!rx) throw new NotFoundException('Prescription not found.');
    if (rx.status !== 'active') throw new BadRequestException('Prescription is no longer active.');
    if (rx.refills_remaining !== null && rx.refills_remaining <= 0) {
      throw new BadRequestException('No refills remaining on this prescription.');
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

    if (error) throw new BadRequestException('Failed to request refill.');

    // Decrement refills remaining
    if (rx.refills_remaining !== null) {
      await this.supabase.admin
        .from('prescriptions')
        .update({ refills_remaining: rx.refills_remaining - 1 })
        .eq('id', dto.prescription_id);
    }

    return data;
  }

  async cancelRefill(refillId: string, patientId: string) {
    const { data, error } = await this.supabase.admin
      .from('prescription_refills')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', refillId)
      .eq('patient_id', patientId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !data) throw new BadRequestException('Refill cannot be cancelled.');
    return data;
  }

  async getRefillablePresciptions(patientId: string) {
    // Active prescriptions with refills available
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

    if (error) throw new BadRequestException('Failed to fetch prescriptions.');
    return data;
  }
}

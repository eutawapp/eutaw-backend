import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class LabService {
  constructor(private supabase: SupabaseService) {}

  // Patient: request lab test(s)
  async createLabOrder(patientId: string, dto: {
    lab_tech_id?: string;
    test_names: string[];
    test_amounts: number[];
    sample_type: string;
    collection_type: 'home_collection' | 'walk_in';
    collection_address?: string;
    scheduled_at?: string;
    notes?: string;
    prescription_id?: string;
  }) {
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

    if (error) throw new BadRequestException('Failed to create lab order.');
    return order;
  }

  // Get orders based on role
  async getOrders(userId: string, role: string, status?: string) {
    let query = this.supabase.admin
      .from('lab_orders')
      .select(`
        *,
        patient:patient_id(users!inner(full_name, phone)),
        lab_tech:lab_tech_id(users!inner(full_name, phone))
      `);

    if (role === 'patient') {
      query = query.eq('patient_id', userId);
    } else if (role === 'lab_tech') {
      query = query.or(`lab_tech_id.eq.${userId},lab_tech_id.is.null`);
    }

    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new BadRequestException('Failed to fetch lab orders.');
    return data;
  }

  async getOrderById(orderId: string, userId: string, role: string) {
    const { data, error } = await this.supabase.admin
      .from('lab_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) throw new NotFoundException('Lab order not found.');

    if (role === 'patient' && data.patient_id !== userId) {
      throw new ForbiddenException('Access denied.');
    }
    if (role === 'lab_tech' && data.lab_tech_id && data.lab_tech_id !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return data;
  }

  // Lab tech: claim an order
  async acceptOrder(orderId: string, labTechId: string) {
    const { data, error } = await this.supabase.admin
      .from('lab_orders')
      .update({ lab_tech_id: labTechId, status: 'sample_collection' })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !data) throw new BadRequestException('Order not available to claim.');
    return data;
  }

  // Lab tech: update order status
  async updateOrderStatus(orderId: string, labTechId: string, dto: {
    status: string;
    result_summary?: string;
    result_file_url?: string;
    result_notes?: string;
  }) {
    const allowed = ['sample_collection', 'processing', 'completed', 'cancelled'];
    if (!allowed.includes(dto.status)) throw new BadRequestException('Invalid status.');

    const update: any = {
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

    if (error || !data) throw new BadRequestException('Failed to update lab order.');
    return data;
  }
}

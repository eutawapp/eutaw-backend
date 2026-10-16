import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class PharmacyService {
  constructor(private supabase: SupabaseService) {}

  // Patient: place a pharmacy order (from prescription or direct)
  async createOrder(patientId: string, dto: {
    prescription_id?: string;
    pharmacist_id?: string;
    delivery_address: string;
    delivery_type: 'delivery' | 'pickup';
    items: Array<{
      drug_name: string;
      quantity: number;
      unit_price: number;
      instructions?: string;
    }>;
    notes?: string;
  }) {
    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const deliveryFee = dto.delivery_type === 'delivery' ? 500 : 0; // ₦500 flat delivery

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

    if (error) throw new BadRequestException('Failed to create order.');

    // Insert order items
    const items = dto.items.map(item => ({
      ...item,
      order_id: order.id,
      subtotal: item.quantity * item.unit_price,
    }));

    await this.supabase.admin.from('pharmacy_order_items').insert(items);

    return { ...order, items };
  }

  // Patient: list my pharmacy orders
  async getPatientOrders(patientId: string, status?: string) {
    let query = this.supabase.admin
      .from('pharmacy_orders')
      .select(`
        *,
        pharmacy_order_items(*),
        pharmacist:pharmacist_id(users!inner(full_name, phone))
      `)
      .eq('patient_id', patientId);

    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new BadRequestException('Failed to fetch orders.');
    return data;
  }

  // Pharmacist: list orders assigned to me or unassigned
  async getPharmacistOrders(pharmacistId: string, status?: string) {
    let query = this.supabase.admin
      .from('pharmacy_orders')
      .select(`
        *,
        pharmacy_order_items(*),
        patient:patient_id(users!inner(full_name, phone))
      `)
      .or(`pharmacist_id.eq.${pharmacistId},pharmacist_id.is.null`);

    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new BadRequestException('Failed to fetch orders.');
    return data;
  }

  async getOrderById(orderId: string, userId: string, role: string) {
    const { data, error } = await this.supabase.admin
      .from('pharmacy_orders')
      .select(`*, pharmacy_order_items(*)`)
      .eq('id', orderId)
      .single();

    if (error || !data) throw new NotFoundException('Order not found.');

    // Access control
    if (role === 'patient' && data.patient_id !== userId) {
      throw new ForbiddenException('Access denied.');
    }
    if (role === 'pharmacist' && data.pharmacist_id && data.pharmacist_id !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return data;
  }

  // Pharmacist: accept/claim an order
  async acceptOrder(orderId: string, pharmacistId: string) {
    const { data, error } = await this.supabase.admin
      .from('pharmacy_orders')
      .update({ pharmacist_id: pharmacistId, status: 'processing' })
      .eq('id', orderId)
      .eq('status', 'pending')
      .is('pharmacist_id', null)
      .select()
      .single();

    if (error || !data) throw new BadRequestException('Order not available to claim.');
    return data;
  }

  // Pharmacist: update order status
  async updateOrderStatus(orderId: string, pharmacistId: string, status: string, tracking_info?: string) {
    const allowed = ['processing', 'ready', 'dispatched', 'delivered'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid status.');

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

    if (error || !data) throw new BadRequestException('Failed to update order status.');
    return data;
  }
}

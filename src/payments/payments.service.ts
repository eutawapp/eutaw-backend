import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackBase = 'https://api.paystack.co';

  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  private get paystackHeaders() {
    return {
      Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    };
  }

  // Initialize a Paystack payment
  async initializePayment(userId: string, dto: {
    amount: number; // in Naira
    email: string;
    resource_type: 'consultation' | 'pharmacy_order' | 'lab_order' | 'subscription';
    resource_id: string;
    metadata?: Record<string, any>;
  }) {
    const reference = `EUTAW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    try {
      const response = await axios.post(
        `${this.paystackBase}/transaction/initialize`,
        {
          amount: dto.amount * 100, // Paystack uses kobo
          email: dto.email,
          reference,
          metadata: {
            user_id: userId,
            resource_type: dto.resource_type,
            resource_id: dto.resource_id,
            ...dto.metadata,
          },
          callback_url: `${this.config.get('APP_URL', 'https://eutaw.app')}/payment/callback`,
        },
        { headers: this.paystackHeaders },
      );

      // Save pending transaction
      await this.supabase.admin.from('transactions').insert({
        user_id: userId,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        amount: dto.amount,
        paystack_reference: reference,
        status: 'pending',
      });

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference,
      };
    } catch (error) {
      this.logger.error('Paystack initialization failed', error.response?.data);
      throw new BadRequestException('Failed to initialize payment.');
    }
  }

  // Verify payment and update records
  async verifyPayment(reference: string) {
    try {
      const response = await axios.get(
        `${this.paystackBase}/transaction/verify/${reference}`,
        { headers: this.paystackHeaders },
      );

      const { status, amount, metadata } = response.data.data;

      if (status !== 'success') {
        throw new BadRequestException('Payment not successful.');
      }

      // Update transaction
      await this.supabase.admin
        .from('transactions')
        .update({ status: 'successful', paystack_transaction_id: response.data.data.id })
        .eq('paystack_reference', reference);

      // Update the resource payment status
      const amountNaira = amount / 100;
      await this.updateResourcePaymentStatus(
        metadata.resource_type,
        metadata.resource_id,
        amountNaira,
      );

      // Trigger payout calculation for practitioner
      if (metadata.resource_type === 'consultation') {
        await this.scheduleConsultationPayout(metadata.resource_id, amountNaira);
      }

      return { message: 'Payment verified successfully.', amount: amountNaira };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Paystack verification failed', error.message);
      throw new BadRequestException('Failed to verify payment.');
    }
  }

  // Paystack webhook handler
  async handleWebhook(body: any, signature: string) {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY');
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature.');
    }

    if (body.event === 'charge.success') {
      await this.verifyPayment(body.data.reference);
    }

    return { received: true };
  }

  private async updateResourcePaymentStatus(resourceType: string, resourceId: string, amount: number) {
    const tableMap: Record<string, string> = {
      consultation: 'consultations',
      pharmacy_order: 'pharmacy_orders',
      lab_order: 'lab_orders',
    };

    const table = tableMap[resourceType];
    if (!table) return;

    await this.supabase.admin
      .from(table)
      .update({ payment_status: 'paid' })
      .eq('id', resourceId);
  }

  private async scheduleConsultationPayout(consultationId: string, totalAmount: number) {
    // Get doctor's payout rate from admin settings
    const { data: rate } = await this.supabase.admin
      .from('payout_rates')
      .select('rate_naira')
      .eq('practitioner_role', 'doctor')
      .eq('is_active', true)
      .single();

    const payoutAmount = rate?.rate_naira || 2500;

    const { data: consult } = await this.supabase.admin
      .from('consultations')
      .select('doctor_id')
      .eq('id', consultationId)
      .single();

    if (!consult) return;

    await this.supabase.admin.from('payouts').insert({
      practitioner_id: consult.doctor_id,
      resource_type: 'consultation',
      resource_id: consultationId,
      amount: payoutAmount,
      platform_fee: totalAmount - payoutAmount,
      status: 'pending',
    });
  }

  // Admin: trigger payout to practitioner via Paystack Transfer
  async processPayout(payoutId: string) {
    const { data: payout } = await this.supabase.admin
      .from('payouts')
      .select(`*, practitioner:practitioner_id(users!inner(full_name, phone))`)
      .eq('id', payoutId)
      .single();

    if (!payout || payout.status !== 'pending') {
      throw new BadRequestException('Payout not available.');
    }

    // TODO: Get practitioner bank details and initiate transfer via Paystack
    // For now, mark as processing
    await this.supabase.admin
      .from('payouts')
      .update({ status: 'processing' })
      .eq('id', payoutId);

    return { message: 'Payout processing initiated.' };
  }

  async getMyEarnings(practitionerId: string) {
    const { data, error } = await this.supabase.admin
      .from('payouts')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('Failed to fetch earnings.');

    const total = data?.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0) || 0;
    const pending = data?.reduce((sum, p) => sum + (p.status === 'pending' ? p.amount : 0), 0) || 0;

    return { payouts: data, total_earned: total, pending_payout: pending };
  }
}

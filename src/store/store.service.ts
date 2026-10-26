import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class StoreService {
  constructor(private supabase: SupabaseService) {}

  // GET /api/v1/store/products
  async getProducts(params: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.supabase.admin
      .from('store_products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (params.category) query = query.eq('category', params.category);
    if (params.search) query = query.ilike('name', `%${params.search}%`);

    const { data, error } = await query
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

    if (error) throw new BadRequestException('Failed to fetch products: ' + error.message);
    return { products: data || [], total: data?.length || 0 };
  }

  // POST /api/v1/store/orders
  async createOrder(patientId: string, dto: any) {
    const { items, delivery_address, notes } = dto;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item.');
    }

    // Validate products and calculate total
    const productIds = items.map((i: any) => i.product_id);
    const { data: products, error: productError } = await this.supabase.admin
      .from('store_products')
      .select('id, name, price, stock_quantity, is_active')
      .in('id', productIds);

    if (productError) throw new BadRequestException('Failed to validate products.');

    let total_amount = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = (products || []).find((p: any) => p.id === item.product_id);
      if (!product) throw new BadRequestException(`Product ${item.product_id} not found.`);
      if (!product.is_active) throw new BadRequestException(`Product "${product.name}" is not available.`);
      if (product.stock_quantity !== null && product.stock_quantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${product.name}".`);
      }

      const subtotal = product.price * item.quantity;
      total_amount += subtotal;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: item.quantity,
        subtotal,
      });
    }

    // Create the order
    const { data: order, error: orderError } = await this.supabase.admin
      .from('store_orders')
      .insert({
        patient_id: patientId,
        status: 'pending',
        total_amount,
        delivery_address: delivery_address || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (orderError) throw new BadRequestException('Failed to create order: ' + orderError.message);

    // Insert order items
    const itemsWithOrderId = orderItems.map(i => ({ ...i, order_id: order.id }));
    const { error: itemsError } = await this.supabase.admin
      .from('store_order_items')
      .insert(itemsWithOrderId);

    if (itemsError) throw new BadRequestException('Failed to save order items: ' + itemsError.message);

    return { order_id: order.id, status: order.status, total_amount, items: orderItems };
  }
}

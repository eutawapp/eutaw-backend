import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('pharmacy')
@UseGuards(JwtAuthGuard)
export class PharmacyController {
  constructor(private pharmacyService: PharmacyService) {}

  // POST /api/v1/pharmacy/orders — patient places order
  @Post('orders')
  @Roles('patient')
  @UseGuards(RolesGuard)
  createOrder(@CurrentUser() user: any, @Body() body: any) {
    return this.pharmacyService.createOrder(user.id, body);
  }

  // GET /api/v1/pharmacy/orders — patient or pharmacist lists orders
  @Get('orders')
  getOrders(@CurrentUser() user: any, @Query('status') status?: string) {
    if (user.role === 'pharmacist') {
      return this.pharmacyService.getPharmacistOrders(user.id, status);
    }
    return this.pharmacyService.getPatientOrders(user.id, status);
  }

  // GET /api/v1/pharmacy/orders/:id
  @Get('orders/:id')
  getOrderById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyService.getOrderById(id, user.id, user.role);
  }

  // PATCH /api/v1/pharmacy/orders/:id/accept — pharmacist claims order
  @Patch('orders/:id/accept')
  @Roles('pharmacist')
  @UseGuards(RolesGuard)
  acceptOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyService.acceptOrder(id, user.id);
  }

  // PATCH /api/v1/pharmacy/orders/:id/status — pharmacist updates status
  @Patch('orders/:id/status')
  @Roles('pharmacist')
  @UseGuards(RolesGuard)
  updateOrderStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { status: string; tracking_info?: string },
  ) {
    return this.pharmacyService.updateOrderStatus(id, user.id, body.status, body.tracking_info);
  }
}

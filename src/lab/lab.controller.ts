import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LabService } from './lab.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('lab')
@UseGuards(JwtAuthGuard)
export class LabController {
  constructor(private labService: LabService) {}

  // POST /api/v1/lab/orders — patient requests lab test
  @Post('orders')
  @Roles('patient')
  @UseGuards(RolesGuard)
  createOrder(@CurrentUser() user: any, @Body() body: any) {
    return this.labService.createLabOrder(user.id, body);
  }

  // GET /api/v1/lab/orders
  @Get('orders')
  getOrders(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.labService.getOrders(user.id, user.role, status);
  }

  // GET /api/v1/lab/orders/:id
  @Get('orders/:id')
  getOrderById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.labService.getOrderById(id, user.id, user.role);
  }

  // PATCH /api/v1/lab/orders/:id/accept — lab tech claims order
  @Patch('orders/:id/accept')
  @Roles('lab_tech')
  @UseGuards(RolesGuard)
  acceptOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.labService.acceptOrder(id, user.id);
  }

  // PATCH /api/v1/lab/orders/:id/status — lab tech updates status / uploads results
  @Patch('orders/:id/status')
  @Roles('lab_tech')
  @UseGuards(RolesGuard)
  updateOrderStatus(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.labService.updateOrderStatus(id, user.id, body);
  }
}

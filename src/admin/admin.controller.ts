import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// All admin routes require JWT + admin role
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // GET /api/v1/admin/dashboard
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ── Users ──────────────────────────────────────────────
  @Get('users')
  listUsers(
    @Query('role') role?: string,
    @Query('is_verified') is_verified?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.listUsers({
      role,
      is_verified: is_verified !== undefined ? is_verified === 'true' : undefined,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/verify')
  verifyPractitioner(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updatePractitionerVerification(id, body);
  }

  @Patch('users/:id/toggle-active')
  toggleUserActive(@Param('id') id: string, @Body() body: { is_active: boolean }) {
    return this.adminService.toggleUserActive(id, body.is_active);
  }

  // ── Payout Rates ───────────────────────────────────────
  @Get('payout-rates')
  getPayoutRates() {
    return this.adminService.getPayoutRates();
  }

  @Patch('payout-rates/:id')
  updatePayoutRate(
    @Param('id') id: string,
    @Body() body: { rate_naira: number },
    @CurrentUser() user: any,
  ) {
    return this.adminService.updatePayoutRate(id, body.rate_naira, user.id);
  }

  // ── Platform Settings ──────────────────────────────────
  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings/:key')
  updateSetting(
    @Param('key') key: string,
    @Body() body: { value: string },
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateSetting(key, body.value, user.id);
  }

  // ── Payouts ─────────────────────────────────────────────
  @Get('payouts')
  listPayouts(@Query('status') status?: string) {
    return this.adminService.listPayouts(status);
  }

  @Patch('payouts/:id/approve')
  approvePayout(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.approvePayout(id, user.id);
  }

  @Patch('payouts/:id/mark-paid')
  markPayoutPaid(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { paystack_transfer_code: string },
  ) {
    return this.adminService.markPayoutPaid(id, user.id, body.paystack_transfer_code);
  }

  // ── Transactions ────────────────────────────────────────
  @Get('transactions')
  listTransactions(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.listTransactions({
      status,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  // ── Audit Logs ──────────────────────────────────────────
  @Get('audit-logs')
  getAuditLogs(
    @Query('actor_id') actor_id?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs({
      actor_id,
      action,
      limit: limit ? parseInt(limit) : 50,
    });
  }
}

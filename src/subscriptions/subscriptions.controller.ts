import { Controller, Get, Post, Delete, Patch, Body, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  // GET /api/v1/subscriptions/plans
  @Get('plans')
  getPlans() { return this.subscriptionsService.getPlans(); }

  // GET /api/v1/subscriptions/mine
  @Get('mine')
  getMine(@CurrentUser() user: any) {
    return this.subscriptionsService.getMySubscription(user.id);
  }

  // GET /api/v1/subscriptions/billing
  @Get('billing')
  getBilling(@CurrentUser() user: any) {
    return this.subscriptionsService.getBillingHistory(user.id);
  }

  // POST /api/v1/subscriptions
  @Post()
  subscribe(@CurrentUser() user: any, @Body() body: any) {
    return this.subscriptionsService.subscribe(user.id, body);
  }

  // DELETE /api/v1/subscriptions
  @Delete()
  cancel(@CurrentUser() user: any) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }

  // PATCH /api/v1/subscriptions/downgrade
  @Patch('downgrade')
  downgrade(@CurrentUser() user: any, @Body() body: any) {
    return this.subscriptionsService.downgrade(user.id, body.plan);
  }
}

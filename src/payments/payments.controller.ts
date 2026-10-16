import { Controller, Post, Get, Body, Param, Headers, UseGuards, RawBodyRequest, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // POST /api/v1/payments/initialize — start a payment
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  initializePayment(@CurrentUser() user: any, @Body() body: any) {
    return this.paymentsService.initializePayment(user.id, {
      ...body,
      email: user.email,
    });
  }

  // GET /api/v1/payments/verify/:reference — verify after redirect
  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  // POST /api/v1/payments/webhook — Paystack webhook (no auth, verified by signature)
  @Post('webhook')
  handleWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }

  // GET /api/v1/payments/earnings — practitioner views earnings
  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @Roles('doctor', 'pharmacist', 'lab_tech')
  @UseGuards(RolesGuard)
  getMyEarnings(@CurrentUser() user: any) {
    return this.paymentsService.getMyEarnings(user.id);
  }
}

import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards
} from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(private consultationsService: ConsultationsService) {}

  // POST /api/v1/consultations — patient creates consultation
  @Post()
  @Roles('patient')
  @UseGuards(RolesGuard)
  createConsultation(@CurrentUser() user: any, @Body() body: any) {
    return this.consultationsService.createConsultation(user.id, body);
  }

  // GET /api/v1/consultations — list my consultations
  @Get()
  getMyConsultations(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.consultationsService.getMyConsultations(user.id, user.role, status);
  }

  // GET /api/v1/consultations/:id
  @Get(':id')
  getConsultation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consultationsService.getConsultationById(id, user.id);
  }

  // PATCH /api/v1/consultations/:id/accept — doctor accepts
  @Patch(':id/accept')
  @Roles('doctor')
  @UseGuards(RolesGuard)
  acceptConsultation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consultationsService.acceptConsultation(id, user.id);
  }

  // PATCH /api/v1/consultations/:id/complete — doctor completes
  @Patch(':id/complete')
  @Roles('doctor')
  @UseGuards(RolesGuard)
  completeConsultation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.consultationsService.completeConsultation(id, user.id, body);
  }

  // POST /api/v1/consultations/:id/messages — send chat message
  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.consultationsService.sendMessage(id, user.id, body);
  }

  // POST /api/v1/consultations/:id/rate — patient rates doctor
  @Post(':id/rate')
  @Roles('patient')
  @UseGuards(RolesGuard)
  rateConsultation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.consultationsService.rateConsultation(id, user.id, body);
  }

  // POST /api/v1/consultations/:id/prescriptions — doctor writes prescription
  @Post(':id/prescriptions')
  @Roles('doctor')
  @UseGuards(RolesGuard)
  createPrescription(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.consultationsService.createPrescription(id, user.id, body);
  }

  // GET /api/v1/consultations/prescriptions/mine — patient views prescriptions
  @Get('prescriptions/mine')
  @Roles('patient')
  @UseGuards(RolesGuard)
  getMyPrescriptions(@CurrentUser() user: any) {
    return this.consultationsService.getPatientPrescriptions(user.id);
  }
}

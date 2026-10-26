import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  // ── KYC ──────────────────────────────────────────────────────

  // POST /api/v1/patients/kyc
  @Post('kyc')
  @Roles('patient')
  @UseGuards(RolesGuard)
  submitKyc(@CurrentUser() user: any, @Body() body: any) {
    return this.patientsService.submitKyc(user.id, body);
  }

  // GET /api/v1/patients/kyc
  @Get('kyc')
  @Roles('patient')
  @UseGuards(RolesGuard)
  getKyc(@CurrentUser() user: any) {
    return this.patientsService.getKyc(user.id);
  }

  // ── MEDICAL HISTORY ───────────────────────────────────────────

  // GET /api/v1/patients/history
  @Get('history')
  @Roles('patient')
  @UseGuards(RolesGuard)
  getHistory(@CurrentUser() user: any) {
    return this.patientsService.getHistory(user.id);
  }

  // PUT /api/v1/patients/history
  @Put('history')
  @Roles('patient')
  @UseGuards(RolesGuard)
  updateHistory(@CurrentUser() user: any, @Body() body: any) {
    return this.patientsService.updateHistory(user.id, body);
  }

  // ── VITALS ───────────────────────────────────────────────────

  // GET /api/v1/patients/vitals
  @Get('vitals')
  @Roles('patient')
  @UseGuards(RolesGuard)
  getVitals(@CurrentUser() user: any) {
    return this.patientsService.getVitals(user.id);
  }

  // POST /api/v1/patients/vitals
  @Post('vitals')
  @Roles('patient')
  @UseGuards(RolesGuard)
  addVital(@CurrentUser() user: any, @Body() body: any) {
    return this.patientsService.addVital(user.id, body);
  }

  // DELETE /api/v1/patients/vitals/:id
  @Delete('vitals/:id')
  @Roles('patient')
  @UseGuards(RolesGuard)
  deleteVital(@CurrentUser() user: any, @Param('id') id: string) {
    return this.patientsService.deleteVital(user.id, id);
  }
}

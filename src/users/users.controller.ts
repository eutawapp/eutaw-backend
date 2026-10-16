import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /api/v1/users/me — get my profile
  @Get('me')
  getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  // PATCH /api/v1/users/me — update my profile
  @Patch('me')
  updateMyProfile(@CurrentUser() user: any, @Body() body: Record<string, any>) {
    return this.usersService.updateProfile(user.id, body);
  }

  // PATCH /api/v1/users/me/health — update patient health profile
  @Patch('me/health')
  @Roles('patient')
  @UseGuards(RolesGuard)
  updateHealthProfile(@CurrentUser() user: any, @Body() body: Record<string, any>) {
    return this.usersService.updatePatientProfile(user.id, body);
  }

  // GET /api/v1/users/me/practitioner — get my practitioner profile
  @Get('me/practitioner')
  @Roles('doctor', 'pharmacist', 'lab_tech')
  @UseGuards(RolesGuard)
  getMyPractitionerProfile(@CurrentUser() user: any) {
    return this.usersService.getPractitionerProfile(user.id);
  }

  // PATCH /api/v1/users/me/practitioner — update practitioner profile
  @Patch('me/practitioner')
  @Roles('doctor', 'pharmacist', 'lab_tech')
  @UseGuards(RolesGuard)
  updatePractitionerProfile(@CurrentUser() user: any, @Body() body: Record<string, any>) {
    return this.usersService.updatePractitionerProfile(user.id, body);
  }

  // GET /api/v1/users/doctors — list available doctors for patient browsing
  @Get('doctors')
  getAvailableDoctors(
    @Query('specialty') specialty?: string,
    @Query('state') state?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getAvailableDoctors({
      specialty,
      state,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // GET /api/v1/users/doctors/:id/reviews
  @Get('doctors/:id/reviews')
  getDoctorReviews(@Param('id') id: string) {
    return this.usersService.getDoctorReviews(id);
  }
}

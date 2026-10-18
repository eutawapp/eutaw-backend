import {
  Controller, Get, Patch, Post, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /api/v1/users/me
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  // PATCH /api/v1/users/me
  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.updateProfile(user.id, body);
  }

  // PATCH /api/v1/users/me/health-profile
  @Patch('me/health-profile')
  updateHealthProfile(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.updatePatientProfile(user.id, body);
  }

  // POST /api/v1/users/me/photo
  @Post('me/photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadProfilePhoto(user.id, file);
  }

  // GET /api/v1/users/me/care-journey
  @Get('me/care-journey')
  getCareJourney(@CurrentUser() user: any) {
    return this.usersService.getCareJourney(user.id);
  }

  // GET /api/v1/users/me/notification-prefs
  @Get('me/notification-prefs')
  getNotifPrefs(@CurrentUser() user: any) {
    return this.usersService.getNotificationPreferences(user.id);
  }

  // PATCH /api/v1/users/me/notification-prefs
  @Patch('me/notification-prefs')
  updateNotifPrefs(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.updateNotificationPreferences(user.id, body);
  }

  // GET /api/v1/users/doctors
  @Get('doctors')
  getDoctors(@Query() query: any) {
    return this.usersService.getAvailableDoctors({
      specialty: query.specialty,
      state: query.state,
      limit: query.limit ? parseInt(query.limit) : 20,
    });
  }

  // GET /api/v1/users/doctors/:id/reviews
  @Get('doctors/:id/reviews')
  getDoctorReviews(@Param('id') id: string) {
    return this.usersService.getDoctorReviews(id);
  }

  // GET /api/v1/users/:id
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}

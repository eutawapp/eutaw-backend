import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // POST /api/v1/notifications/register-device
  @Post('register-device')
  registerDevice(@CurrentUser() user: any, @Body() body: any) {
    return this.notificationsService.registerDevice(user.id, body);
  }

  // GET /api/v1/notifications
  @Get()
  getMyNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  // PATCH /api/v1/notifications/read
  @Patch('read')
  markAsRead(@CurrentUser() user: any, @Body() body: { ids: string[] }) {
    return this.notificationsService.markAsRead(user.id, body.ids);
  }
}

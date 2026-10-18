import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { RefillsService } from './refills.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('refills')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('patient')
export class RefillsController {
  constructor(private refillsService: RefillsService) {}

  // GET /api/v1/refills
  @Get()
  getMyRefills(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.refillsService.getMyRefills(user.id, status);
  }

  // GET /api/v1/refills/eligible
  @Get('eligible')
  getEligible(@CurrentUser() user: any) {
    return this.refillsService.getRefillablePresciptions(user.id);
  }

  // GET /api/v1/refills/:id
  @Get(':id')
  getRefill(@Param('id') id: string, @CurrentUser() user: any) {
    return this.refillsService.getRefillById(id, user.id);
  }

  // POST /api/v1/refills
  @Post()
  requestRefill(@CurrentUser() user: any, @Body() body: any) {
    return this.refillsService.requestRefill(user.id, body);
  }

  // DELETE /api/v1/refills/:id
  @Delete(':id')
  cancelRefill(@Param('id') id: string, @CurrentUser() user: any) {
    return this.refillsService.cancelRefill(id, user.id);
  }
}

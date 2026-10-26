import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('store')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(private storeService: StoreService) {}

  // GET /api/v1/store/products
  @Get('products')
  getProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.storeService.getProducts({
      category,
      search,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  // POST /api/v1/store/orders
  @Post('orders')
  @Roles('patient')
  @UseGuards(RolesGuard)
  createOrder(@CurrentUser() user: any, @Body() body: any) {
    return this.storeService.createOrder(user.id, body);
  }
}

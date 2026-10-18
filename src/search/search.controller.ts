import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  // GET /api/v1/search?q=amoxicillin
  @Get()
  search(@Query('q') q: string, @CurrentUser() user: any) {
    return this.searchService.search(q, user.id);
  }

  // GET /api/v1/search/doctors?q=cardio
  @Get('doctors')
  searchDoctors(@Query('q') q: string) {
    return this.searchService.searchDoctors(q || '');
  }
}

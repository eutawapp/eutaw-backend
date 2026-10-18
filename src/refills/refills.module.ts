import { Module } from '@nestjs/common';
import { RefillsController } from './refills.controller';
import { RefillsService } from './refills.service';
import { SupabaseModule } from '../common/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [RefillsController],
  providers: [RefillsService],
  exports: [RefillsService],
})
export class RefillsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { LabModule } from './lab/lab.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RefillsModule } from './refills/refills.module';
import { SearchModule } from './search/search.module';
import { PatientsModule } from './patients/patients.module';
import { StoreModule } from './store/store.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    MulterModule.register({ storage: memoryStorage() }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    ConsultationsModule,
    PharmacyModule,
    LabModule,
    PaymentsModule,
    NotificationsModule,
    AdminModule,
    SubscriptionsModule,
    RefillsModule,
    SearchModule,
    PatientsModule,
    StoreModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

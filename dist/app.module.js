"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const supabase_module_1 = require("./common/supabase/supabase.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const consultations_module_1 = require("./consultations/consultations.module");
const pharmacy_module_1 = require("./pharmacy/pharmacy.module");
const lab_module_1 = require("./lab/lab.module");
const payments_module_1 = require("./payments/payments.module");
const notifications_module_1 = require("./notifications/notifications.module");
const admin_module_1 = require("./admin/admin.module");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const refills_module_1 = require("./refills/refills.module");
const search_module_1 = require("./search/search.module");
const health_controller_1 = require("./health/health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            throttler_1.ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
            platform_express_1.MulterModule.register({ storage: (0, multer_1.memoryStorage)() }),
            supabase_module_1.SupabaseModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            consultations_module_1.ConsultationsModule,
            pharmacy_module_1.PharmacyModule,
            lab_module_1.LabModule,
            payments_module_1.PaymentsModule,
            notifications_module_1.NotificationsModule,
            admin_module_1.AdminModule,
            subscriptions_module_1.SubscriptionsModule,
            refills_module_1.RefillsModule,
            search_module_1.SearchModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
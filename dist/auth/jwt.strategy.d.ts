import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private config;
    private supabase;
    constructor(config: ConfigService, supabase: SupabaseService);
    validate(payload: {
        sub: string;
        phone: string;
        role: string;
    }): Promise<{
        id: any;
        full_name: any;
        phone: any;
        email: any;
        role: any;
        is_active: any;
        is_verified: any;
    }>;
}
export {};

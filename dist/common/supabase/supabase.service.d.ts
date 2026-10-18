import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private config;
    private adminClient;
    private publicClient;
    constructor(config: ConfigService);
    get admin(): SupabaseClient;
    getClientForUser(accessToken: string): SupabaseClient;
}

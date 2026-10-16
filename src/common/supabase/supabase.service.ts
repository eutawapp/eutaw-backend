import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  // Admin client — uses service_role key, bypasses RLS
  // Use this for backend operations (creating users, audit logs, etc.)
  private adminClient: SupabaseClient;

  // Public client — uses anon key, respects RLS
  // Use this when acting on behalf of a user
  private publicClient: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');

    this.adminClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.publicClient = createClient(url, anonKey);
  }

  // Use for: creating users, audit logs, admin operations
  get admin(): SupabaseClient {
    return this.adminClient;
  }

  // Use for: user-scoped queries (pass user JWT)
  getClientForUser(accessToken: string): SupabaseClient {
    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; phone: string; role: string }) {
    const { data: user } = await this.supabase.admin
      .from('users')
      .select('id, full_name, phone, email, role, is_active, is_verified')
      .eq('id', payload.sub)
      .single();

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Account not found or suspended.');
    }

    return user; // Attached to request.user
  }
}

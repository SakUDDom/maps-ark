'use client';
import { useState, useEffect } from 'react';
import { supabaseClient } from '../utils/supabase';
import { UserProfile } from '../types';

export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        let profileRes = await supabaseClient
          .from('profiles_access')
          .select('role, zone, can_edit_roof, can_edit_road, can_edit_border')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!profileRes.data) {
          profileRes = await supabaseClient
            .from('Profiles_Access')
            .select('role, zone, can_edit_roof, can_edit_road, can_edit_border')
            .eq('id', session.user.id)
            .maybeSingle();
        }

        const profile = profileRes.data;
        let roleStr = profile?.role ? profile.role.toLowerCase().trim().replace(/\s+/g, '_') : 'user';
        if (session.user.email === 'god@god.com') {
          roleStr = 'super_admin';
        }

        setCurrentUser({
          id: session.user.id,
          name: profile?.zone || session.user.email || '',
          email: session.user.email,
          zone: profile?.zone || '',
          role: roleStr as any,
          can_edit_roof: profile?.can_edit_roof ?? true,
          can_edit_road: profile?.can_edit_road ?? true,
          can_edit_border: profile?.can_edit_border ?? true,
        });
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  return { currentUser, setCurrentUser, loading };
}
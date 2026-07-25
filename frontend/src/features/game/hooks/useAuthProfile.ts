'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { AuthUser } from '../types';
import { getAuthApiBaseUrl } from '../utils';

export function useAuthProfile() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token') || localStorage.getItem('token');
      if (!token) {
        setAuthError('NO_TOKEN');
        setLoadingUser(false);
        return;
      }

      try {
        const response = await fetch(`${getAuthApiBaseUrl()}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Invalid token');
        }

        const data = await response.json();
        setUser({
          id: data.user.id || data.user._id,
          name: data.user.name,
          avatar: data.user.avatar || '',
        });
        localStorage.setItem('token', token);
        setAuthError(null);
      } catch (error) {
        console.error('Token validation failed:', error);
        setAuthError('INVALID_TOKEN');
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    void validateToken();
  }, [searchParams]);

  return { user, loadingUser, authError, setAuthError };
}

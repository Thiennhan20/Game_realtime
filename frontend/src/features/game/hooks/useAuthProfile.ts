'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { AuthUser } from '../types';
import { getAuthApiBaseUrl } from '../utils';

/**
 * Decode JWT payload locally (base64 only, no signature verification).
 * Used to extract user info instantly before the auth server on Render responds.
 * Returns null for expired or malformed tokens.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const raw: unknown = JSON.parse(atob(base64));
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw as Record<string, unknown>;
    // Reject expired tokens
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function useAuthProfile() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem('auth_user_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string' && parsed.name && parsed.name.toLowerCase() !== 'player') {
          return parsed as AuthUser;
        }
      }
    } catch {
      // Ignore parse error
    }
    return null;
  });
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

      // --- Fast path: decode JWT locally for instant lobby access ---
      const payload = decodeJwtPayload(token);
      if (payload && typeof payload.userId === 'string') {
        const userId = payload.userId;
        const jwtName =
          (typeof payload.name === 'string' ? payload.name : null) ??
          (typeof payload.username === 'string' ? payload.username : null);

        setUser((prev) => {
          if (prev && prev.name && prev.name.toLowerCase() !== 'player') return prev;
          if (jwtName && jwtName.toLowerCase() !== 'player') {
            return { id: userId, name: jwtName, avatar: '' };
          }
          return prev;
        });
        setLoadingUser(false);
        localStorage.setItem('token', token);
      }

      // --- Background verification: fetch full profile from auth server ---
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
        const fetchedUser: AuthUser = {
          id: data.user.id || data.user._id,
          name: data.user.name || data.user.username || '',
          avatar: data.user.avatar || '',
        };
        setUser(fetchedUser);
        try {
          localStorage.setItem('auth_user_cache', JSON.stringify(fetchedUser));
          localStorage.setItem('token', token);
        } catch {
          // Ignore storage quota error
        }
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

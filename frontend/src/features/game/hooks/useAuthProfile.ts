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

function getTokenFromLocationOrStorage(searchParams: ReturnType<typeof useSearchParams>): string | null {
  const fromParams = searchParams.get('token');
  if (fromParams) return fromParams;
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get('token');
      if (fromUrl) return fromUrl;
    } catch {
      // Ignore URL parse error
    }
    return localStorage.getItem('token');
  }
  return null;
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
    let active = true;

    const validateToken = async () => {
      const token = getTokenFromLocationOrStorage(searchParams);
      if (!token) {
        if (active) {
          setUser(null);
          setAuthError('NO_TOKEN');
          setLoadingUser(false);
        }
        return;
      }

      // Fast path: decode JWT locally IF user has valid name
      const payload = decodeJwtPayload(token);
      let fastPathSuccess = false;
      if (payload && typeof payload.userId === 'string') {
        const userId = payload.userId;
        const jwtName =
          (typeof payload.name === 'string' ? payload.name : null) ??
          (typeof payload.username === 'string' ? payload.username : null);

        if (jwtName && jwtName.toLowerCase() !== 'player') {
          if (active) {
            setUser({ id: userId, name: jwtName, avatar: '' });
            setLoadingUser(false);
            fastPathSuccess = true;
          }
          localStorage.setItem('token', token);
        }
      }

      if (!fastPathSuccess && active) {
        setLoadingUser(true);
      }

      // Background verification: fetch full profile from auth server
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
        if (active) {
          setUser(fetchedUser);
          setAuthError(null);
          setLoadingUser(false);
        }
        try {
          localStorage.setItem('auth_user_cache', JSON.stringify(fetchedUser));
          localStorage.setItem('token', token);
        } catch {
          // Ignore storage quota error
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        if (active) {
          setAuthError('INVALID_TOKEN');
          setUser(null);
          setLoadingUser(false);
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('auth_user_cache');
          } catch {
            // Ignore storage error
          }
        }
      }
    };

    void validateToken();
    return () => {
      active = false;
    };
  }, [searchParams]);

  return { user, loadingUser, authError, setAuthError };
}

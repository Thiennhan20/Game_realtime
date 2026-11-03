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

function getInitialUser(searchParams: ReturnType<typeof useSearchParams>): AuthUser | null {
  const token = getTokenFromLocationOrStorage(searchParams);
  const payload = token ? decodeJwtPayload(token) : null;
  const jwtUserId = payload && typeof payload.userId === 'string' ? payload.userId : null;

  // 1. Check URL parameters passed from parent window or URL navigation
  let pName = searchParams.get('userName') || searchParams.get('name');
  let pId = searchParams.get('userId') || searchParams.get('id');
  let pAvatar = searchParams.get('userAvatar') || searchParams.get('avatar');

  if (typeof window !== 'undefined' && !pName) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      pName = urlParams.get('userName') || urlParams.get('name');
      pId = urlParams.get('userId') || urlParams.get('id');
      pAvatar = urlParams.get('userAvatar') || urlParams.get('avatar');
    } catch {
      // Ignore URL parse error
    }
  }

  const resolvedId = pId || jwtUserId;

  if (pName && pName.toLowerCase() !== 'player' && resolvedId) {
    return {
      id: resolvedId,
      name: pName,
      avatar: pAvatar || '',
    };
  }

  // 2. Fast path: decode JWT locally if token has user name
  if (payload && jwtUserId) {
    const jwtName =
      (typeof payload.name === 'string' ? payload.name : null) ??
      (typeof payload.username === 'string' ? payload.username : null);

    if (jwtName && jwtName.toLowerCase() !== 'player') {
      return {
        id: jwtUserId,
        name: jwtName,
        avatar: typeof payload.avatar === 'string' ? payload.avatar : '',
      };
    }
  }

  // 3. Check localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('auth_user_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.name === 'string' &&
          parsed.name &&
          parsed.name.toLowerCase() !== 'player' &&
          (!jwtUserId || String(parsed.id) === String(jwtUserId))
        ) {
          return {
            ...(parsed as AuthUser),
            id: jwtUserId || (parsed as AuthUser).id,
          };
        }
      }
    } catch {
      // Ignore parse error
    }
  }

  return null;
}

export function useAuthProfile() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(() => getInitialUser(searchParams));
  const [loadingUser, setLoadingUser] = useState(() => {
    const initial = getInitialUser(searchParams);
    return !initial;
  });
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

      // Fast path check
      const initialUser = getInitialUser(searchParams);
      if (initialUser && active) {
        setUser(initialUser);
        setLoadingUser(false);
        try {
          localStorage.setItem('token', token);
          localStorage.setItem('auth_user_cache', JSON.stringify(initialUser));
        } catch {
          // Ignore
        }
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

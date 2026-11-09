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
  if (fromParams) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('token', fromParams);
        // Level 1: Sanitize URL immediately to prevent token exposure in address bar
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        const cleanPath = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
        window.history.replaceState({}, document.title, cleanPath);
      } catch {}
    }
    return fromParams;
  }
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get('token');
      if (fromUrl) {
        localStorage.setItem('token', fromUrl);
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        const cleanPath = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
        window.history.replaceState({}, document.title, cleanPath);
        return fromUrl;
      }
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
  const [parentMovieUser, setParentMovieUser] = useState<AuthUser | null>(null);
  const [parentMovieToken, setParentMovieToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let gracePeriodTimer: NodeJS.Timeout | null = null;
    const isEmbedded =
      typeof window !== 'undefined' &&
      (window.parent !== window || searchParams.get('embedded') === '1');

    const validateToken = async (tokenToVerify?: string) => {
      const token = tokenToVerify || getTokenFromLocationOrStorage(searchParams);
      if (!token) {
        if (isEmbedded) {
          // Inside iframe: wait for postMessage AUTH_TOKEN from parent
          if (!gracePeriodTimer) {
            gracePeriodTimer = setTimeout(() => {
              if (active) {
                const checkToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (!checkToken) {
                  setUser(null);
                  setAuthError('NO_TOKEN');
                  setLoadingUser(false);
                }
              }
            }, 3500);
          }
          return;
        }
        if (active) {
          setUser(null);
          setAuthError('NO_TOKEN');
          setLoadingUser(false);
        }
        return;
      }

      if (gracePeriodTimer) {
        clearTimeout(gracePeriodTimer);
        gracePeriodTimer = null;
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

    // Level 2: Listen for AUTH_TOKEN message from parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'AUTH_TOKEN') {
        const receivedToken = typeof event.data?.token === 'string' ? event.data.token : null;
        const pUser =
          event.data?.user && event.data.user.id
            ? {
                id: String(event.data.user.id),
                name: String(event.data.user.name || ''),
                avatar: String(event.data.user.avatar || ''),
              }
            : null;

        if (active) {
          setParentMovieToken(receivedToken);
          setParentMovieUser(pUser);
        }

        // If user explicitly chose a separate game account, do NOT override with movie site account
        const accountMode = typeof window !== 'undefined' ? localStorage.getItem('game_account_mode') : null;
        if (accountMode === 'custom') {
          return;
        }

        if (receivedToken) {
          try {
            localStorage.setItem('token', receivedToken);
          } catch {}
          if (gracePeriodTimer) {
            clearTimeout(gracePeriodTimer);
            gracePeriodTimer = null;
          }
          if (pUser && active) {
            setUser(pUser);
            setLoadingUser(false);
            setAuthError(null);
            try {
              localStorage.setItem('auth_user_cache', JSON.stringify(pUser));
            } catch {}
          }
          void validateToken(receivedToken);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      // If embedded, ask parent window for the token immediately
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({ type: 'REQUEST_AUTH_TOKEN' }, '*');
        } catch {}
      }
    }

    void validateToken();

    return () => {
      active = false;
      if (gracePeriodTimer) clearTimeout(gracePeriodTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', handleMessage);
      }
    };
  }, [searchParams]);

  const loginWithCredentials = async (email: string, password: string) => {
    try {
      const response = await fetch(`${getAuthApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.token) {
        return {
          success: false,
          error: data.message || 'Invalid email or password',
        };
      }

      const fetchedUser: AuthUser = {
        id: data.user.id || data.user._id,
        name: data.user.name || data.user.username || '',
        avatar: data.user.avatar || '',
      };

      try {
        localStorage.setItem('token', data.token);
        localStorage.setItem('game_account_mode', 'custom');
        localStorage.setItem('auth_user_cache', JSON.stringify(fetchedUser));
      } catch {}

      setUser(fetchedUser);
      setAuthError(null);
      setLoadingUser(false);

      const isDifferentFromMovie = Boolean(
        parentMovieUser && String(parentMovieUser.id) !== String(fetchedUser.id)
      );

      return {
        success: true,
        user: fetchedUser,
        isDifferentFromMovie,
      };
    } catch (err) {
      console.error('Login error:', err);
      return {
        success: false,
        error: 'Network error or server unavailable',
      };
    }
  };

  const useParentMovieAccount = () => {
    if (!parentMovieToken) return;
    try {
      localStorage.setItem('token', parentMovieToken);
      localStorage.setItem('game_account_mode', 'sync');
      if (parentMovieUser) {
        localStorage.setItem('auth_user_cache', JSON.stringify(parentMovieUser));
        setUser(parentMovieUser);
      }
    } catch {}
    setAuthError(null);
    setLoadingUser(false);
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user_cache');
      localStorage.removeItem('game_account_mode');
    } catch {}
    setUser(null);
    setAuthError('NO_TOKEN');
    setLoadingUser(false);
  };

  return {
    user,
    loadingUser,
    authError,
    setAuthError,
    parentMovieUser,
    parentMovieToken,
    loginWithCredentials,
    useParentMovieAccount,
    logout,
  };
}

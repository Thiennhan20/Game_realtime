'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { AuthUser } from '../types';
import { getAuthApiBaseUrl } from '../utils';

/**
 * Decode JWT payload locally (base64 only, no signature verification).
 * Used to extract user info instantly before the auth server responds.
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

function getInitialUser(searchParams: ReturnType<typeof useSearchParams>, isEmbedded: boolean): AuthUser | null {
  // If embedded in movie site iframe, do NOT preload unverified user before parent handshake
  if (isEmbedded) {
    // Only preload if explicitly in custom account mode
    if (typeof window !== 'undefined' && localStorage.getItem('game_account_mode') === 'custom') {
      const customToken = localStorage.getItem('token');
      if (customToken) {
        const payload = decodeJwtPayload(customToken);
        if (payload && payload.userId) {
          try {
            const cached = localStorage.getItem('auth_user_cache');
            if (cached) return JSON.parse(cached);
          } catch {}
        }
      }
    }
    return null;
  }

  const token = getTokenFromLocationOrStorage(searchParams);
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const jwtUserId = payload && typeof payload.userId === 'string' ? payload.userId : null;
  if (!jwtUserId) return null;

  // 1. Check URL parameters
  let pName = searchParams.get('userName') || searchParams.get('name');
  let pAvatar = searchParams.get('userAvatar') || searchParams.get('avatar');
  if (pName && pName.toLowerCase() !== 'player') {
    return {
      id: jwtUserId,
      name: pName,
      avatar: pAvatar || '',
    };
  }

  // 2. JWT payload name
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

  // 3. LocalStorage cache
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
          String(parsed.id) === String(jwtUserId)
        ) {
          return parsed as AuthUser;
        }
      }
    } catch {}
  }

  return null;
}

export function useAuthProfile() {
  const searchParams = useSearchParams();
  const isEmbedded =
    typeof window !== 'undefined' &&
    (window.parent !== window || searchParams.get('embedded') === '1');

  const [token, setToken] = useState<string | null>(() => {
    if (isEmbedded) {
      if (typeof window !== 'undefined' && localStorage.getItem('game_account_mode') === 'custom') {
        return localStorage.getItem('token');
      }
      return null;
    }
    return getTokenFromLocationOrStorage(searchParams);
  });

  const [user, setUser] = useState<AuthUser | null>(() => getInitialUser(searchParams, isEmbedded));
  const [loadingUser, setLoadingUser] = useState(() => {
    if (isEmbedded) return true;
    const initial = getInitialUser(searchParams, false);
    return !initial;
  });

  const [authError, setAuthError] = useState<string | null>(null);
  const [parentMovieUser, setParentMovieUser] = useState<AuthUser | null>(null);
  const [parentMovieToken, setParentMovieToken] = useState<string | null>(null);
  const [isDifferentAccount, setIsDifferentAccount] = useState(false);

  useEffect(() => {
    let active = true;
    let gracePeriodTimer: NodeJS.Timeout | null = null;

    const validateToken = async (tokenToVerify?: string) => {
      const activeToken = tokenToVerify || token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

      if (!activeToken) {
        if (isEmbedded) {
          // Inside iframe: wait for postMessage AUTH_TOKEN from parent window
          if (!gracePeriodTimer) {
            gracePeriodTimer = setTimeout(() => {
              if (active) {
                const checkToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (!checkToken) {
                  setUser(null);
                  setToken(null);
                  setAuthError('NO_TOKEN');
                  setLoadingUser(false);
                }
              }
            }, 3000);
          }
          return;
        }

        // Standalone mode with no token: provide a brief smooth loading step before showing login
        setTimeout(() => {
          if (active) {
            setUser(null);
            setToken(null);
            setAuthError('NO_TOKEN');
            setLoadingUser(false);
          }
        }, 400);
        return;
      }

      if (gracePeriodTimer) {
        clearTimeout(gracePeriodTimer);
        gracePeriodTimer = null;
      }

      // Fast path: decode payload immediately
      const payload = decodeJwtPayload(activeToken);
      if (payload && payload.userId && active) {
        setToken(activeToken);
        const cachedUser = getInitialUser(searchParams, false);
        if (cachedUser) {
          setUser(cachedUser);
          setAuthError(null);
          setLoadingUser(false);
        }
      }

      // Background verification: fetch full profile from auth server
      try {
        const response = await fetch(`${getAuthApiBaseUrl()}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${activeToken}`,
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
          setToken(activeToken);
          setAuthError(null);
          setLoadingUser(false);
        }
        try {
          localStorage.setItem('auth_user_cache', JSON.stringify(fetchedUser));
          localStorage.setItem('token', activeToken);
        } catch {}
      } catch (error) {
        console.warn('Token validation failed:', error);
        if (active) {
          setAuthError('INVALID_TOKEN');
          setUser(null);
          setToken(null);
          setLoadingUser(false);
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('auth_user_cache');
          } catch {}
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

        const accountMode = typeof window !== 'undefined' ? localStorage.getItem('game_account_mode') : null;
        const existingCustomToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        // Custom account mode: user explicitly signed into a separate account in Game
        if (accountMode === 'custom' && existingCustomToken) {
          const customPayload = decodeJwtPayload(existingCustomToken);
          const customUserId = customPayload && typeof customPayload.userId === 'string' ? customPayload.userId : null;
          let customUser: AuthUser | null = null;
          try {
            const cached = localStorage.getItem('auth_user_cache');
            if (cached) customUser = JSON.parse(cached);
          } catch {}

          if (pUser && customUserId && String(pUser.id) !== String(customUserId)) {
            if (active) setIsDifferentAccount(true);
          }
          if (active) {
            setToken(existingCustomToken);
            if (customUser) setUser(customUser);
            setAuthError(null);
            setLoadingUser(false);
          }
          void validateToken(existingCustomToken);
          return;
        }

        // Default / Sync mode: smoothly synchronize with parent movie session
        if (receivedToken) {
          try {
            localStorage.setItem('token', receivedToken);
            localStorage.setItem('game_account_mode', 'sync');
            if (pUser) localStorage.setItem('auth_user_cache', JSON.stringify(pUser));
          } catch {}

          if (gracePeriodTimer) {
            clearTimeout(gracePeriodTimer);
            gracePeriodTimer = null;
          }

          if (active) {
            setToken(receivedToken);
            if (pUser) setUser(pUser);
            setAuthError(null);
            setIsDifferentAccount(false);
            setLoadingUser(false);
          }
          void validateToken(receivedToken);
        } else {
          // Parent movie session is unauthenticated (guest)
          if (gracePeriodTimer) {
            clearTimeout(gracePeriodTimer);
            gracePeriodTimer = null;
          }
          if (active) {
            setToken(null);
            setUser(null);
            setAuthError('NO_TOKEN');
            setIsDifferentAccount(false);
            setLoadingUser(false);
          }
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
  }, [searchParams, isEmbedded]);

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

      setToken(data.token);
      setUser(fetchedUser);
      setAuthError(null);
      setLoadingUser(false);

      const isDifferentFromMovie = Boolean(
        parentMovieUser && String(parentMovieUser.id) !== String(fetchedUser.id)
      );
      if (isDifferentFromMovie) {
        setIsDifferentAccount(true);
      } else {
        setIsDifferentAccount(false);
      }

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
    setToken(parentMovieToken);
    setAuthError(null);
    setIsDifferentAccount(false);
    setLoadingUser(false);
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user_cache');
      localStorage.removeItem('game_account_mode');
    } catch {}
    setToken(null);
    setUser(null);
    setAuthError('NO_TOKEN');
    setIsDifferentAccount(false);
    setLoadingUser(false);
  };

  return {
    user,
    token,
    loadingUser,
    authError,
    setAuthError,
    parentMovieUser,
    parentMovieToken,
    isDifferentAccount,
    setIsDifferentAccount,
    loginWithCredentials,
    useParentMovieAccount,
    logout,
  };
}

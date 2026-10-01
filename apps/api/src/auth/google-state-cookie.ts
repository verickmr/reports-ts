import type { CookieRequest } from './session-cookie.js';
import {
  googleAuthAttemptDurationMs,
  googleStatePattern,
} from './google-auth.constants.js';

export const googleStateCookieName = 'portal_google_state';

export type GoogleCookieResponse = {
  getHeader(name: string): number | string | string[] | undefined;
  setHeader(name: string, value: string | string[]): void;
};

export function readGoogleStateCookie(request: CookieRequest): string | null {
  const matches = (request.headers.cookie?.split(';') ?? [])
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(`${googleStateCookieName}=`));
  if (matches.length !== 1) return null;
  const state = matches[0]?.slice(googleStateCookieName.length + 1) ?? '';
  return googleStatePattern.test(state) ? state : null;
}

export function writeGoogleStateCookie(
  response: GoogleCookieResponse,
  state: string | null,
): void {
  const attributes = [
    `${googleStateCookieName}=${state ?? ''}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/auth/google/callback',
    state ? `Max-Age=${googleAuthAttemptDurationMs / 1000}` : 'Max-Age=0',
  ];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');

  const current = response.getHeader('Set-Cookie');
  const cookies = Array.isArray(current)
    ? current
    : typeof current === 'string'
      ? [current]
      : [];
  response.setHeader('Set-Cookie', [...cookies, attributes.join('; ')]);
}

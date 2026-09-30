export const sessionCookieName = 'portal_session';
export const sessionDurationMs = 8 * 60 * 60 * 1000;

export type CookieRequest = { headers: { cookie?: string } };
export type CookieResponse = {
  setHeader(name: string, value: string): void;
};

export function readSessionToken(request: CookieRequest): string | null {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const matches = cookies
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(`${sessionCookieName}=`));
  if (matches.length !== 1) return null;
  const token = matches[0]?.slice(sessionCookieName.length + 1) ?? '';
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function writeSessionCookie(
  response: CookieResponse,
  token: string | null,
): void {
  const attributes = [
    `${sessionCookieName}=${token ?? ''}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api',
    token ? `Max-Age=${sessionDurationMs / 1000}` : 'Max-Age=0',
  ];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  response.setHeader('Set-Cookie', attributes.join('; '));
}

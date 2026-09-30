import {
  authResponseSchema,
  loginInputSchema,
  type AuthResponse,
  type LoginInput,
} from '@portal/contracts';

export const sessionQueryKey = ['session'] as const;

export async function fetchSession(): Promise<AuthResponse | null> {
  const response = await fetch('/api/auth/me');
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Não foi possível verificar a sessão.');
  return authResponseSchema.parse(await response.json());
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginInputSchema.parse(input)),
  });
  if (response.status === 401) throw new Error('Usuário ou senha inválidos.');
  if (!response.ok)
    throw new Error('Não foi possível entrar. Tente novamente.');
  return authResponseSchema.parse(await response.json());
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error('Não foi possível encerrar a sessão.');
}

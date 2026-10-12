'use server';

import { clearSession, createSession, getAuthConfig } from '@/lib/auth/session';
import { passwordMatches } from '@/lib/auth/token';
import type { LoginState } from '@/lib/auth/types';
import { deleteOldBookings } from '@/lib/booking/queries';

const FAILED_LOGIN_DELAY_MS = 500;
const LOGIN_FAILED_MESSAGE = 'Login gagal. Periksa password Anda.';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function loginAdmin(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get('password');
  const config = getAuthConfig();

  // Same response for missing config and wrong password.
  if (!config || !passwordMatches(password, config.password)) {
    await sleep(FAILED_LOGIN_DELAY_MS);
    return { status: 'error', message: LOGIN_FAILED_MESSAGE };
  }

  await createSession();
  await deleteOldBookings(new Date()).catch((error) => console.error('[cleanup]', error));

  // Setting the cookie already re-renders; no refresh() needed.
  return { status: 'success' };
}

export async function logoutAdmin(): Promise<void> {
  await clearSession();
}

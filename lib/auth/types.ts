// Shared auth contract; 'use server' files may export only async functions.

export type LoginState = { status: 'idle' | 'success' | 'error'; message?: string };

export const initialLoginState: LoginState = { status: 'idle' };

// Shared by server check and input `maxLength`.
export const ADMIN_PASSWORD_MAX = 200;

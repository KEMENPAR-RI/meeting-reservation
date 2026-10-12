import { logoutAdmin } from '@/app/actions/auth';
import { isAdmin } from '@/lib/auth/session';
import { LoginDialog } from './login-dialog';

const buttonClass =
  'inline-flex h-9 items-center justify-center rounded-lg border border-primary/30 bg-white px-3 text-sm font-medium text-primary ' +
  'hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors';

export async function AdminControls() {
  const admin = await isAdmin();

  if (!admin) return <LoginDialog />;

  // Plain form: logout works without JS.
  return (
    <form action={logoutAdmin} className="flex shrink-0 items-center gap-2">
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
        Admin
      </span>
      <button type="submit" className={buttonClass}>
        Logout
      </button>
    </form>
  );
}

// Same height as the controls so the header does not shift.
export function AdminControlsFallback() {
  return <div aria-hidden="true" className="h-9 w-20 shrink-0" />;
}

import { extractClientIp, isIpAllowed, parseAllowlist, type IpRule } from './ip-allowlist';

// Shared by proxy.ts and Server Actions; fails closed on any doubt.

export type OfficeDenyReason =
  | 'not-configured'
  | 'invalid-config'
  | 'invalid-header-name'
  | 'missing-ip'
  | 'not-allowed';

export type OfficeAccessResult = { allowed: true } | { allowed: false; reason: OfficeDenyReason };

const DEFAULT_IP_HEADER = 'x-real-ip';
const HEADER_NAME = /^[a-z0-9-]{1,64}$/;

const logged = new Set<string>();
let allowlistCache: { raw: string; rules: IpRule[] | null } | undefined;

// Config problems are logged once per process, never per request.
function logOnce(key: string, log: () => void): void {
  if (logged.has(key)) return;
  logged.add(key);
  log();
}

export function isOfficeCheckBypassed(): boolean {
  // Fail closed: only an explicit "false" disables the check.
  if (process.env.OFFICE_IP_CHECK?.trim().toLowerCase() !== 'false') return false;
  logOnce('bypass', () => console.warn('[office-ip] OFFICE_IP_CHECK=false: IP check disabled'));
  return true;
}

// null = invalid header name; callers must deny.
export function getTrustedIpHeader(): string | null {
  const name = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase() || DEFAULT_IP_HEADER;
  if (HEADER_NAME.test(name)) return name;
  logOnce('header', () => console.error('[office-ip] invalid TRUSTED_IP_HEADER'));
  return null;
}

function getAllowlist(): IpRule[] | null {
  const raw = process.env.OFFICE_ALLOWED_IPS ?? '';
  if (allowlistCache?.raw !== raw) allowlistCache = { raw, rules: parseAllowlist(raw) };
  return allowlistCache.rules;
}

export function checkOfficeAccess(headers: Headers): OfficeAccessResult {
  if (isOfficeCheckBypassed()) return { allowed: true };

  const rules = getAllowlist();
  if (!rules) {
    logOnce('invalid', () => console.error('[office-ip] invalid OFFICE_ALLOWED_IPS'));
    return { allowed: false, reason: 'invalid-config' };
  }
  if (rules.length === 0) {
    logOnce('empty', () => console.error('[office-ip] OFFICE_ALLOWED_IPS is empty'));
    return { allowed: false, reason: 'not-configured' };
  }

  const headerName = getTrustedIpHeader();
  if (!headerName) return { allowed: false, reason: 'invalid-header-name' };

  const ip = extractClientIp(headers.get(headerName));
  if (!ip) return { allowed: false, reason: 'missing-ip' };

  return isIpAllowed(ip, rules) ? { allowed: true } : { allowed: false, reason: 'not-allowed' };
}

// Rate-limit key from the same trusted header: IPv4 per address, IPv6 per /64; null = deny.
export function getClientIpKey(headers: Headers): string | null {
  const headerName = getTrustedIpHeader();
  if (!headerName) return null;
  const ip = extractClientIp(headers.get(headerName));
  if (!ip) return null;
  const value = ip.version === 6 ? ip.value >> BigInt(64) : ip.value;
  return `${ip.version}:${value.toString(16)}`;
}

import { NextResponse, type NextRequest } from 'next/server';

import { FORBIDDEN_HTML } from '@/lib/forbidden-html';
import { checkOfficeAccess } from '@/lib/office-access';
import { isPublicAttendancePath } from '@/lib/public-paths';

const PUBLIC_METHODS = new Set(['GET', 'HEAD', 'POST']);

export function proxy(request: NextRequest) {
  if (checkOfficeAccess(request.headers).allowed) return NextResponse.next();
  // POST is needed for the public Server Action; every other action re-checks office access itself.
  if (isPublicAttendancePath(request.nextUrl.pathname) && PUBLIC_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  // Direct 403 body: no /forbidden route, so no redirect loop and no 200 for outsiders.
  return new Response(FORBIDDEN_HTML, {
    status: 403,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static/|images/).*)'],
};

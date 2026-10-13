import { NextResponse, type NextRequest } from 'next/server';

import { FORBIDDEN_HTML } from '@/lib/forbidden-html';
import { checkOfficeAccess } from '@/lib/office-access';

export function proxy(request: NextRequest) {
  if (checkOfficeAccess(request.headers).allowed) return NextResponse.next();

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

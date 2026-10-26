import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { isAdmin } from '@/lib/auth/session';
import { LOG_MAX_ROWS, parseLogFilters, resolveRange, toExportRows } from '@/lib/booking/log';
import { getLogBookings } from '@/lib/booking/queries';

const formatSchema = z.enum(['xlsx', 'pdf']);

const CONTENT_TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

const NO_STORE = { 'cache-control': 'private, no-store' };

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

// GET /api/log/export?format=xlsx|pdf&year=&division=&dateStart=&dateEnd=&bookerName=
export async function GET(request: NextRequest): Promise<Response> {
  // Block cross-site navigations; clients without the header pass.
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return jsonError(403, 'Permintaan lintas situs ditolak.');
  }

  // Second gate after the proxy IP allowlist; isAdmin() also defers the clock (io()).
  if (!(await isAdmin())) return jsonError(401, 'Tidak diizinkan.');

  const params = request.nextUrl.searchParams;
  const format = formatSchema.safeParse(params.get('format'));
  if (!format.success) return jsonError(400, 'Format tidak valid (xlsx atau pdf).');

  // Same parser as the page, so the export matches the active filter.
  const filters = parseLogFilters(params);
  const { rows: bookings, truncated } = await getLogBookings(resolveRange(filters), {
    division: filters.division,
    bookerName: filters.bookerName,
  });
  if (truncated) {
    return jsonError(
      413,
      `Data terlalu banyak (lebih dari ${LOG_MAX_ROWS} reservasi). Persempit filter terlebih dahulu.`,
    );
  }
  const rows = toExportRows(bookings);

  const { buildLogPdf, buildLogXlsx } = await import('@/lib/booking/log-export');
  const title = `Log Reservasi ${filters.year}`;
  const body =
    format.data === 'xlsx' ? await buildLogXlsx(rows, title) : await buildLogPdf(rows, title);

  return new Response(body, {
    headers: {
      ...NO_STORE,
      'content-type': CONTENT_TYPES[format.data],
      'content-disposition': `attachment; filename="log-reservasi-${filters.year}.${format.data}"`,
      'x-content-type-options': 'nosniff',
    },
  });
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './utils/auth';

// Next.js 16: konvensi "middleware" diganti "proxy" (fungsi & nama file).
export async function proxy(request: NextRequest) {
  // ── Dev bypass: buka gate Telegram saat development biar bisa update app
  //    secara lokal. Di production (Vercel) auth tetap aktif penuh.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // ── Bypass: API routes tidak perlu auth (proxy ke backend)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── Validasi SIGNATURE JWT pada cookie (bukan cuma cek keberadaannya),
  //    supaya cookie palsu/acak ditolak. Edge-compatible via jose.
  const token = request.cookies.get('tg_member_session')?.value;
  const valid = await verifySession(token, process.env.JWT_SECRET);

  if (!valid && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/access-denied';
    return NextResponse.redirect(url);
  }

  // ── Lanjutkan semua request lainnya
  return NextResponse.next();
}

// Hanya terapkan ke path yang membutuhkan perlindungan
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|access-denied|logo-tradingstars.jpg|favicon.ico).*)',
  ],
};

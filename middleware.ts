import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Ambil token dari cookie tg_member_session
  const sessionCookie = request.cookies.get('tg_member_session');
  const { pathname } = request.nextUrl;

  // ── Bypass: API routes tidak perlu auth (proxy ke backend)
  // Ini memastikan /api/stock/* dan route lainnya tetap bisa diakses
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── Jika tidak ada cookie dan user mencoba mengakses root halaman → redirect
  if (!sessionCookie && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/access-denied';
    return NextResponse.redirect(url);
  }

  // ── Lanjutkan semua request lainnya
  return NextResponse.next();
}

// Hanya terapkan middleware ke path yang membutuhkan perlindungan
export const config = {
  matcher: [
    /*
     * Mengecualikan path berikut agar tidak diperiksa:
     * - _next/static (file Javascript statis/CSS)
     * - _next/image (optimisasi gambar)
     * - favicon.ico, dan aset public lainnya
     * Catatan: /api/* sekarang di-bypass langsung di dalam fungsi middleware
     */
    '/((?!_next/static|_next/image|access-denied|logo-tradingstars.jpg|favicon.ico).*)',
  ],
};

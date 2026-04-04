import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Ambil token dari cookie tg_member_session
  const sessionCookie = request.cookies.get('tg_member_session');

  const url = request.nextUrl.clone();
  
  // Jika tidak ada cookie dan user mencoba mengakses root halaman, dialihkan
  if (!sessionCookie && url.pathname === '/') {
    url.pathname = '/access-denied';
    return NextResponse.redirect(url);
  }

  // Lanjutkan request jika ada cookie, atau mengakses /access-denied
  return NextResponse.next();
}

// Hanya terapkan middleware ke path yang membutuhkan perlindungan
export const config = {
  matcher: [
    /*
     * Mengecualikan path berikut agar tidak diperiksa:
     * - api/auth (sistem login bot)
     * - access-denied (halaman ditolak)
     * - _next/static (file Javascript statis/CSS)
     * - _next/image (optimisasi gambar)
     * - favicon.ico, dan aset public lainnya 
     */
    '/((?!api/auth|api/bot|_next/static|_next/image|access-denied|logo-tradingstars.jpg|favicon.ico).*)',
  ],
};

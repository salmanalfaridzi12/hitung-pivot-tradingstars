import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is missing' }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not defined in environment variables');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    // Verifikasi Token
    const decoded = jwt.verify(token, secret);
    
    // Redirect ke dashboard setelah verifikasi
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Set cookie untuk memvalidasi akses (berdurasi 7 hari)
    response.cookies.set({
      name: 'tg_member_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}

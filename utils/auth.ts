import { jwtVerify } from "jose";

/**
 * Verifikasi cookie session `tg_member_session` (sebuah JWT HS256).
 *
 * Catatan desain penting:
 *  - Token di-sign bot dengan masa berlaku 5 menit (untuk LINK login sekali pakai).
 *  - Sesi sebenarnya diatur oleh masa berlaku COOKIE (7 hari).
 *  - Maka token yang "expired" TETAP sah untuk sesi, ASAL signature-nya valid —
 *    artinya benar dibuat oleh server kita (JWT_SECRET), bukan dipalsukan.
 *
 * Yang ditolak: cookie palsu/acak, token diubah-ubah, atau algoritma di luar HS256.
 */
export async function verifySession(token?: string | null, secret?: string | null): Promise<boolean> {
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true; // signature valid & belum kedaluwarsa
  } catch (e: unknown) {
    // jose memverifikasi signature SEBELUM cek exp. Jadi error "expired" berarti
    // signature-nya sudah lolos → token asli → sah untuk sesi (cookie 7 hari).
    if ((e as { code?: string })?.code === "ERR_JWT_EXPIRED") return true;
    return false; // signature salah / token rusak / alg tidak diizinkan
  }
}

/** Ambil nilai cookie `tg_member_session` dari header Cookie mentah. */
export function readSessionCookie(cookieHeader?: string | null): string {
  const m = (cookieHeader || "").match(/(?:^|;\s*)tg_member_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

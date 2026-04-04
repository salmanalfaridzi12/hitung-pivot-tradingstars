import { NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import jwt from 'jsonwebtoken';

// Mengambil environment variables dengan fallback string kosong agar type checker (TypeScript) tidak protes
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const GROUP_ID = process.env.GROUP_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Inisialisasi object Telegraf yang akan melayani logic bot
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Selamat datang di Telegram Gatekeeper Pivot Analyzer. Silakan gunakan perintah /login.');
});

bot.command('login', async (ctx) => {
  try {
    const userId = ctx.from.id;
    // Mendapatkan status anggota di dalam grup privat
    const member = await ctx.telegram.getChatMember(GROUP_ID, userId);
    
    // Periksa apakah peran mereka mengizinkan (bukan 'left' atau 'kicked')
    if (['creator', 'administrator', 'member'].includes(member.status)) {
      // Pembuatan JWT untuk verifikasi session selama 5 menit
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '5m' });
      const loginUrl = `${SITE_URL}/api/auth?token=${token}`;
      
      // Mengirimkan tiket session dengan tombol Inline URL Telegram
      ctx.reply(`✅ Keanggotaan VIP Dikonfirmasi.\n\nKlik layar monitor di bawah ini untuk mengakses Pivot Analyzer Pro. (Tautan ini hanya berlaku untuk 5 menit):`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🖥️ Buka Pivot Analyzer Pro", url: loginUrl }]
          ]
        }
      });
    } else {
      ctx.reply('❌ Akses ditolak. Anda belum terdaftar sebagai anggota grup resmi TradingStars.');
    }
  } catch (error) {
    console.error('Error handling /login command:', error);
    ctx.reply('❌ Terjadi kegagalan komunikasi dengan server atau Anda tidak berada di dalam grup.');
  }
});

// Mengekspose Endpoint POST khusus untuk konsumsi Next.js Vercel Webhook
export async function POST(req: Request) {
  try {
    // Apabila BOT_TOKEN kosong, jangan paksakan telegraf dijalankan
    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Server mengalami kesalahan konfigurasi (BOT_TOKEN tidak ditemukan).' }, { status: 500 });
    }
    
    const body = await req.json();
    
    // Meneruskan update dari Telegram (JSON) langsung ke handler Telegraf lokal
    await bot.handleUpdate(body);
    
    return NextResponse.json({ success: true, message: 'Webhook diproses dengan sukses' }, { status: 200 });
  } catch (error) {
    console.error('Terjadi pengecualian (Exception) saat webhook dipanggil:', error);
    // Kita paksakan pengembalian status 200 kepada server telegram meskipun error internal
    // agar telegram tidak membanjiri re-trigger webhook berkali-kali jika server merespons 500.
    return NextResponse.json({ error: 'Kesalahan internal webhook' }, { status: 200 });
  }
}

// Handler pengujian manual Endpoint (saat dikunjungi via browser web / GET request)
export async function GET(req: Request) {
  return NextResponse.json({ status: 'Webhook endpoint aktif. Silakan kirimkan format POST dari server Telegram.' }, { status: 200 });
}

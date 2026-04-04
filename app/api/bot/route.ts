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

// Menyimpan cache sederhana di memori Vercel untuk anti-spam (batas burst 5 detik)
const cooldowns = new Set<number>();

bot.start((ctx) => {
  ctx.reply('Selamat datang di Telegram Gatekeeper Pivot Analyzer. Silakan gunakan perintah /login.');
});

bot.command('login', async (ctx) => {
  try {
    const userId = ctx.from.id;
    
    // Anti-spam: Tolak respon bila menekan /login terus-terusan
    if (cooldowns.has(userId)) return;
    cooldowns.add(userId);
    setTimeout(() => cooldowns.delete(userId), 5000);

    // Pastikan ID grup dideklarasikan dan bersih dari spasi (trim)
    const cleanGroupId = GROUP_ID.trim();

    // Mendapatkan status anggota di dalam grup privat
    const member = await ctx.telegram.getChatMember(cleanGroupId, userId);
    
    // Periksa apakah peran mereka mengizinkan ('creator', 'administrator', 'member', atau 'restricted' asal bukan left/kicked)
    if (['creator', 'administrator', 'member', 'restricted'].includes(member.status)) {
      // Pembuatan JWT untuk verifikasi session selama 5 menit
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '5m' });
      const loginUrl = `${SITE_URL}/api/auth?token=${token}`;
      
      // Mengirimkan tiket session dengan tombol Inline URL Telegram
      ctx.reply(`✅ Keanggotaan VIP Dikonfirmasi.\n\nKlik monitor di bawah ini untuk mengakses Pivot Analyzer Pro. (Tautan berlaku 5 menit):`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🖥️ Buka Pivot Analyzer Pro", url: loginUrl }]
          ]
        }
      });
    } else {
      ctx.reply(`❌ Akses ditolak. Anda terdeteksi belum berada di dalam grup.\n\n(Info Diagnostik - Status Anda di Group ID ${cleanGroupId} adalah: ${member.status})`);
    }
  } catch (error: any) {
    console.error('Error handling /login command:', error);
    ctx.reply(`❌ Error Komunikasi API. Bot gagal melacak Anda.\nPastikan:\n1. Bot diculik/masuk menjadi Admin grup.\n2. GROUP_ID benar: ${GROUP_ID}\n(Pesan error teknis: ${error.message})`);
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

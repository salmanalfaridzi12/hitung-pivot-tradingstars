import { NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import jwt from 'jsonwebtoken';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const GROUP_ID = process.env.GROUP_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Selamat datang! Gunakan perintah /login untuk memverifikasi keanggotaan dan mengakses web tujuan.');
});

bot.command('login', async (ctx) => {
  try {
    const userId = ctx.from.id;
    // Pengecekan member dalam grup
    const member = await ctx.telegram.getChatMember(GROUP_ID, userId);
    
    if (['creator', 'administrator', 'member'].includes(member.status)) {
      // Buat token expire dalam 5 menit
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '5m' });
      const loginUrl = `${SITE_URL}/api/auth?token=${token}`;
      
      // Kirim pesan interaktif berupa tombol URL inline
      ctx.reply(`✅ Anda telah terverifikasi sebagai member komunitas.\n\nKlik tautan di bawah ini untuk masuk. (Link kedaluwarsa dalam 5 menit):`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🖥️ Buka Pivot Analyzer Pro", url: loginUrl }]
          ]
        }
      });
    } else {
      ctx.reply('❌ Akses ditolak. Anda belum menjadi member di grup VIP kami.');
    }
  } catch (error) {
    console.error('Error on /login:', error);
    ctx.reply('❌ Terjadi kesalahan saat memeriksa status member atau Anda belum berada di grup resmi.');
  }
});

// Handler utama Endpoint POST Vercel (menerima Webhook dari Telegram)
export async function POST(req: Request) {
  try {
    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Tidak ada BOT_TOKEN.' }, { status: 500 });
    }
    
    // Ambil payload JSON dari request telegram
    const body = await req.json();
    
    // Alirkan trigger webhook ini ke telegraf JS solver
    await bot.handleUpdate(body);
    
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

require('dotenv').config({ path: '../.env.local' });
const { Telegraf } = require('telegraf');
const jwt = require('jsonwebtoken');

const bot = new Telegraf(process.env.BOT_TOKEN);
const GROUP_ID = process.env.GROUP_ID;
const JWT_SECRET = process.env.JWT_SECRET;

bot.start((ctx) => {
  ctx.reply('Selamat datang! Gunakan perintah /login untuk masuk ke Pivot Analyzer.');
});

bot.command('login', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const member = await ctx.telegram.getChatMember(GROUP_ID, userId);
    
    if (['creator', 'administrator', 'member'].includes(member.status)) {
      // 5 menit expired
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '5m' });
      
      // Update dominan-saya.com ke domain asli Vercel Anda nantinya
      const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth?token=${token}`;
      
      ctx.reply(`✅ Anda adalah member komunitas.\n\nKlik tautan ini untuk masuk (link kedaluwarsa dlm 5 menit):\n${loginUrl}`);
    } else {
      ctx.reply('❌ Akses ditolak. Anda belum menjadi member di grup resmi kami.');
    }
  } catch (error) {
    console.error(error);
    ctx.reply('❌ Terjadi kesalahan saat memeriksa status member atau Anda belum join grup.');
  }
});

bot.launch().then(() => {
  console.log('🤖 Telegram Gatekeeper bot started!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

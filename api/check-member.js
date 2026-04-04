export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId diperlukan" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = "-1002251390462"; // Chat ID grup Trading Stars

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatId}&user_id=${userId}`
    );
    const data = await response.json();

    if (data.ok && ["member", "administrator", "creator"].includes(data.result.status)) {
      return res.status(200).json({ isMember: true });
    } else {
      return res.status(200).json({ isMember: false });
    }
  } catch (error) {
    return res.status(500).json({ error: "Gagal menghubungi Telegram API" });
  }
}

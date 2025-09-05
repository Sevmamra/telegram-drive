import axios from "axios";

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    // getFile from Telegram
    const info = await axios.get(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${id}`
    );
    const filePath = info.data.result.file_path;
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    return res.redirect(url);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get file" });
  }
}

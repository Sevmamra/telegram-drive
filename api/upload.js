import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN)
    return res.status(401).json({ error: "Unauthorized" });

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // handle safari/ipad issue (files.file can be array or object)
    const uploadedFile = Array.isArray(files.file)
      ? files.file[0]
      : files.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: "No file received" });
    }

    const filename =
      (Array.isArray(fields.filename) ? fields.filename[0] : fields.filename) ||
      uploadedFile.originalFilename ||
      "unnamed";
    const caption =
      (Array.isArray(fields.caption) ? fields.caption[0] : fields.caption) || "";

    const fileStream = fs.createReadStream(uploadedFile.filepath);

    // Send to Telegram
    const tgForm = new FormData();
    tgForm.append("chat_id", process.env.CHANNEL_ID);
    tgForm.append("document", fileStream, filename);
    if (caption) tgForm.append("caption", caption);

    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendDocument`,
      tgForm,
      { headers: tgForm.getHeaders() }
    );

    if (!response.data.ok) {
      console.error("Telegram error:", response.data);
      return res.status(500).json({ error: "Telegram upload failed" });
    }

    const fileData = response.data.result.document;

    // Save metadata in Supabase
    const { error } = await supabase.from("files").insert([
      {
        file_id: fileData.file_id,
        file_name: filename,
        caption,
      },
    ]);
    if (error) throw error;

    return res.json({
      success: true,
      file: {
        file_id: fileData.file_id,
        file_name: filename,
        caption,
        uploaded_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed", details: err.message });
  }
}

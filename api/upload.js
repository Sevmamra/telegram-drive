import formidable from "formidable";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
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

    // Sirf test ke liye response bhej rahe hain
    return res.json({
      ok: true,
      fields,
      files: {
        file: {
          originalFilename: files.file?.originalFilename || null,
          mimetype: files.file?.mimetype || null,
          size: files.file?.size || null,
          filepath: files.file?.filepath || null
        }
      }
    });
  } catch (err) {
    console.error("DEBUG upload error:", err);
    return res.status(500).json({ error: "Upload debug failed", details: String(err) });
  }
}

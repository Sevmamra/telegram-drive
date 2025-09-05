import formidable from "formidable";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const form = formidable({ multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error("Form parse error:", err);
        return res.status(500).json({ error: "formidable failed", details: String(err) });
      }
      res.json({ ok: true, fields, files });
    });
  } catch (err) {
    console.error("Outer error:", err);
    return res.status(500).json({ error: "Upload debug failed", details: String(err) });
  }
}

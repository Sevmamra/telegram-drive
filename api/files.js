import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    return res.json({ files: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch files" });
  }
}

import { NextResponse } from "next/server";
import { requireBlogAuthor } from "@/lib/blog-auth";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import path from "path";
import { optimizeBlogImageBuffer } from "@/lib/blog-image-optimize";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
/** Original upload limit before optimization (output is typically much smaller WebP). */
const MAX_UPLOAD = 15 * 1024 * 1024;
const MAX_STORED = 15 * 1024 * 1024;
const BUCKET = "blog-images";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  const { unauthorized } = await requireBlogAuthor();
  if (unauthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPG, PNG, WebP, and GIF allowed." }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD) {
      return NextResponse.json({ error: "File too large. Maximum 15MB before optimization." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const header = buffer.slice(0, 4);
    const isJpeg = header[0] === 0xff && header[1] === 0xd8;
    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
    const isGif = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46;
    const isWebp = buffer.length >= 12 && buffer.slice(8, 12).toString() === "WEBP";

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      return NextResponse.json({ error: "File content does not match an allowed image type" }, { status: 400 });
    }

    let uploadBuffer = buffer;
    let contentType = file.type;
    let outExt = ext;
    try {
      const optimized = await optimizeBlogImageBuffer(buffer);
      uploadBuffer = Buffer.from(optimized.buffer);
      contentType = optimized.contentType;
      outExt = optimized.ext;
    } catch (e) {
      console.warn("Blog image optimization skipped:", e);
    }

    if (uploadBuffer.length > MAX_STORED) {
      return NextResponse.json({ error: "Image too large after processing." }, { status: 400 });
    }

    const filename = `${randomBytes(16).toString("hex")}${outExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, uploadBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

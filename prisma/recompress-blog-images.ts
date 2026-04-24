/**
 * Re-encode existing Supabase blog-images in place: smaller files + updated URLs in DB.
 *
 * Requires: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: RECOMPRESS_DRY_RUN=1
 *
 * Run: npx tsx prisma/recompress-blog-images.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "crypto";

import { optimizeBlogImageBuffer } from "../src/lib/blog-image-optimize";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const BUCKET = "blog-images";
const DRY = process.env.RECOMPRESS_DRY_RUN === "1";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function collectUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  const re = new RegExp(`https?://[^"'\\s>]+/storage/v1/object/public/${BUCKET}/[^"'\\s>]+`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    urls.push(m[0].replace(/[),.;]+$/, "").split("#")[0]);
  }
  return urls;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  try {
    new URL(supabaseUrl);
  } catch {
    console.error("Invalid NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }

  const supabase = getSupabase();

  const posts = await prisma.blogPost.findMany({
    select: { id: true, title: true, content: true, featuredImage: true },
  });

  const authors = await prisma.blogAuthor.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, avatarUrl: true },
  });

  const uniquePaths = new Map<string, Set<string>>();

  function considerUrl(url: string | null | undefined) {
    if (!url) return;
    const p = extractStoragePath(url, BUCKET);
    if (!p) return;
    if (!uniquePaths.has(p)) uniquePaths.set(p, new Set());
    uniquePaths.get(p)!.add(url.split("#")[0]);
  }

  for (const p of posts) {
    considerUrl(p.featuredImage);
    for (const u of collectUrlsFromHtml(p.content)) {
      considerUrl(u);
    }
  }
  for (const a of authors) {
    considerUrl(a.avatarUrl);
  }

  console.log(`Found ${uniquePaths.size} unique objects in ${BUCKET}`);

  /** old public URL (normalized) -> new public URL */
  const urlMap = new Map<string, string>();

  for (const [objectPath, urlSet] of Array.from(uniquePaths.entries())) {
    const exampleUrl = Array.from(urlSet)[0];
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(objectPath);
    if (dlErr || !blob) {
      console.warn(`⚠️  Download failed ${objectPath}:`, dlErr?.message);
      continue;
    }

    const input = Buffer.from(await blob.arrayBuffer());

    let optimized: { buffer: Buffer; contentType: string; ext: string };
    try {
      optimized = await optimizeBlogImageBuffer(input);
    } catch (e) {
      console.warn(`⚠️  Optimize failed ${objectPath}:`, e);
      continue;
    }

    if (optimized.buffer.length >= input.length) {
      console.log(`⏭️  Skip (not smaller) ${objectPath}`);
      continue;
    }

    const newName = `${randomBytes(16).toString("hex")}${optimized.ext}`;

    if (DRY) {
      console.log(`[dry] ${objectPath} → ${newName} (${input.length} → ${optimized.buffer.length} bytes)`);
      continue;
    }

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(newName, optimized.buffer, {
      contentType: optimized.contentType,
      upsert: false,
    });
    if (upErr) {
      console.warn(`⚠️  Upload failed ${newName}:`, upErr.message);
      continue;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newName);
    for (const oldUrl of Array.from(urlSet)) {
      urlMap.set(normalizePublicUrl(oldUrl), pub.publicUrl);
    }

    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (rmErr) console.warn(`⚠️  Remove old object failed ${objectPath}:`, rmErr.message);

    console.log(`✅ ${objectPath} → ${newName} (${input.length} → ${optimized.buffer.length} bytes)`);
  }

  if (DRY) {
    console.log("\nDry run finished (no uploads or DB changes).");
    return;
  }

  if (urlMap.size === 0) {
    console.log("No URLs to rewrite in database.");
    return;
  }

  const sortedReplacements = Array.from(urlMap.entries()).sort((a, b) => b[0].length - a[0].length);

  function applyReplacements(html: string): string {
    let out = html;
    for (const [from, to] of sortedReplacements) {
      if (from === to) continue;
      out = out.split(from).join(to);
    }
    return out;
  }

  for (const p of posts) {
    let content = p.content;
    let featured = p.featuredImage;
    for (const [from, to] of sortedReplacements) {
      if (featured && normalizePublicUrl(featured) === normalizePublicUrl(from)) featured = to;
    }
    content = applyReplacements(content);
    if (content !== p.content || featured !== p.featuredImage) {
      await prisma.blogPost.update({
        where: { id: p.id },
        data: { content, featuredImage: featured },
      });
      console.log(`📝 Post updated: ${p.title}`);
    }
  }

  for (const a of authors) {
    if (!a.avatarUrl) continue;
    let next = a.avatarUrl;
    for (const [from, to] of sortedReplacements) {
      if (normalizePublicUrl(next) === normalizePublicUrl(from)) next = to;
    }
    if (next !== a.avatarUrl) {
      await prisma.blogAuthor.update({ where: { id: a.id }, data: { avatarUrl: next } });
      console.log(`📝 Author avatar updated: ${a.id}`);
    }
  }

  console.log("\nDone.");
}

function normalizePublicUrl(u: string): string {
  return u.split("#")[0].replace(/\/$/, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

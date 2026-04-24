/**
 * One-off import: WordPress posts + images → Prisma + Supabase Storage.
 *
 * Requires: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: WORDPRESS_IMPORT_URL (default https://blog.demisrestaurant.co.uk)
 *           BLOG_IMPORT_AUTHOR_EMAIL (default blog@demisrestaurant.co.uk)
 *           WORDPRESS_IMPORT_DRY_RUN=1 — fetch and log only, no DB writes
 *
 * Run: npx tsx prisma/import-wordpress.ts
 */
import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "crypto";
import * as path from "path";
import { writeFileSync } from "fs";

import { sanitizeHtml } from "../src/lib/blog-sanitize";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const WP_BASE = (process.env.WORDPRESS_IMPORT_URL || "https://blog.demisrestaurant.co.uk").replace(/\/$/, "");
const SITE_URL = "https://www.demisrestaurant.co.uk";
const BUCKET = "blog-images";
const DRY = process.env.WORDPRESS_IMPORT_DRY_RUN === "1";
const AUTHOR_EMAIL = process.env.BLOG_IMPORT_AUTHOR_EMAIL || "blog@demisrestaurant.co.uk";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

type WpPost = {
  id: number;
  date: string;
  slug: string;
  status: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  categories: number[];
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string;
      mime_type?: string;
      media_details?: {
        sizes?: Record<string, { source_url?: string; file?: string; width?: number; height?: number }>;
      };
    }>;
  };
};

type WpCategory = {
  id: number;
  name: string;
  slug: string;
};

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function decodeSlug(slug: string): string {
  try {
    let s = slug;
    try {
      s = decodeURIComponent(slug);
    } catch {
      /* keep */
    }
    return s.trim();
  } catch {
    return slug.trim();
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Decode common WordPress HTML entities for clean titles and excerpts. */
function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function cleanupWpComments(html: string): string {
  return html
    .replace(/<!--\s*wp:[\s\S]*?-->/gi, "")
    .replace(/<!--\s*\/wp:\w+\s*-->/gi, "");
}

function validateImageBuffer(buffer: Buffer): { ok: boolean; ext: string; mime: string } {
  if (buffer.length < 12) return { ok: false, ext: "", mime: "" };
  const h = buffer;
  const isJpeg = h[0] === 0xff && h[1] === 0xd8;
  const isPng = h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47;
  const isGif = h[0] === 0x47 && h[1] === 0x49 && h[2] === 0x46;
  const isWebp = buffer.slice(8, 12).toString() === "WEBP";
  if (isJpeg) return { ok: true, ext: ".jpg", mime: "image/jpeg" };
  if (isPng) return { ok: true, ext: ".png", mime: "image/png" };
  if (isGif) return { ok: true, ext: ".gif", mime: "image/gif" };
  if (isWebp) return { ok: true, ext: ".webp", mime: "image/webp" };
  return { ok: false, ext: "", mime: "" };
}

function extFromUrl(u: string): string {
  try {
    const p = new URL(u).pathname;
    const e = path.extname(p).toLowerCase();
    if (ALLOWED_EXT.has(e)) return e;
  } catch {
    /* ignore */
  }
  return ".jpg";
}

async function fetchBuffer(url: string): Promise<{ buffer: Buffer; contentType: string | null } | null> {
  const abs = url.startsWith("http") ? url : `${WP_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  const res = await fetch(abs, { redirect: "follow" });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type");
  const ab = await res.arrayBuffer();
  return { buffer: Buffer.from(ab), contentType: ct };
}

async function uploadImageUrl(
  supabase: SupabaseClient,
  url: string,
  urlCache: Map<string, string>,
): Promise<string | null> {
  const normalized = url.split("#")[0];
  if (urlCache.has(normalized)) return urlCache.get(normalized)!;

  const fetched = await fetchBuffer(normalized);
  if (!fetched) {
    console.warn(`  ⚠️  Could not fetch image: ${normalized}`);
    return null;
  }

  let { buffer } = fetched;
  if (buffer.length > MAX_IMAGE_BYTES) {
    console.warn(`  ⚠️  Image too large (${buffer.length} bytes), skipping: ${normalized}`);
    return null;
  }

  let { ok, ext, mime } = validateImageBuffer(buffer);
  if (!ok) {
    const ct = fetched.contentType?.split(";")[0]?.trim().toLowerCase() || "";
    if (ALLOWED_MIME.has(ct)) {
      mime = ct;
      ext = extFromUrl(normalized);
      ok = true;
    }
  }
  if (!ok) {
    console.warn(`  ⚠️  Not a valid image file: ${normalized}`);
    return null;
  }

  if (!ALLOWED_EXT.has(ext)) ext = extFromUrl(normalized);

  const filename = `${randomBytes(16).toString("hex")}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    console.warn(`  ⚠️  Supabase upload failed (${normalized}): ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  const publicUrl = data.publicUrl;
  urlCache.set(normalized, publicUrl);
  return publicUrl;
}

function pickFeaturedUrl(media: {
  source_url: string;
  media_details?: { sizes?: Record<string, { source_url?: string }> };
}): string | null {
  const sizes = media.media_details?.sizes;
  const order = ["large", "medium_large", "medium", "thumbnail", "full"];
  if (sizes) {
    for (const key of order) {
      const u = sizes[key]?.source_url;
      if (u) return u;
    }
  }
  return media.source_url || null;
}

function hostnameMatchesWp(host: string): boolean {
  const h = host.toLowerCase();
  return h === "blog.demisrestaurant.co.uk" || h.endsWith(".demisrestaurant.co.uk");
}

function replaceFirst(haystack: string, needle: string, repl: string): string {
  const i = haystack.indexOf(needle);
  if (i === -1) return haystack;
  return haystack.slice(0, i) + repl + haystack.slice(i + needle.length);
}

/** Replace blog.demisrestaurant.co.uk links; rehost wp-content images to Supabase (src, srcset, data-src). */
async function rewriteHtml(
  html: string,
  supabase: SupabaseClient | null,
  urlCache: Map<string, string>,
  idToSlug: Map<number, string>,
  slugAliases: Map<string, string>,
): Promise<string> {
  let out = html;

  // ?p=ID links
  out = out.replace(/https?:\/\/blog\.demisrestaurant\.co\.uk\/\?p=(\d+)/gi, (_, id) => {
    const slug = idToSlug.get(Number(id));
    return slug ? `${SITE_URL}/blog/${encodeURIComponent(slug)}` : `${SITE_URL}/blog`;
  });

  // /yyyy/mm/dd/slug/ permalinks
  out = out.replace(
    /https?:\/\/blog\.demisrestaurant\.co\.uk\/(\d{4})\/(\d{2})\/(\d{2})\/([^/?#]+)\/?/gi,
    (_, _y, _m, _d, slugSeg) => {
      const decoded = decodeSlug(slugSeg);
      const canonical = slugAliases.get(decoded.toLowerCase()) || decoded;
      return `${SITE_URL}/blog/${encodeURIComponent(canonical)}`;
    },
  );

  // Category archive → filtered blog index
  out = out.replace(
    /https?:\/\/blog\.demisrestaurant\.co\.uk\/category\/([^/?#"'\s>]+)\/?/gi,
    (_, c) => `${SITE_URL}/blog?category=${encodeURIComponent(decodeSlug(c))}`,
  );

  // Remaining pages on blog host (not uploads)
  out = out.replace(/https?:\/\/blog\.demisrestaurant\.co\.uk\/(?!wp-content)[^"'\s>]*/gi, `${SITE_URL}/blog`);

  const rehost = async (u: string): Promise<string | null> => {
    if (!supabase) return null;
    const abs = u.startsWith("http")
      ? u
      : u.startsWith("//")
        ? `https:${u}`
        : `${WP_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
    try {
      const host = new URL(abs).hostname;
      if (!hostnameMatchesWp(host)) return null;
      return uploadImageUrl(supabase, abs, urlCache);
    } catch {
      return null;
    }
  };

  const getAttr = (attrs: string, name: string): string | null => {
    const re = new RegExp(`\\b${name}\\s*=\\s*(["'])([^"']*)\\1`, "i");
    const mm = attrs.match(re);
    return mm ? mm[2] : null;
  };

  const setAttr = (attrs: string, name: string, value: string, quote: `"` | `'` = `"`): string => {
    const re = new RegExp(`\\b${name}\\s*=\\s*(["'])[^"']*\\1`, "i");
    if (re.test(attrs)) return attrs.replace(re, `${name}=${quote}${value}${quote}`);
    return `${attrs.trimEnd()} ${name}=${quote}${value}${quote}`;
  };

  const imgMatches = [...out.matchAll(/<img\b([^>]*)>/gi)];
  for (const match of imgMatches) {
    const fullTag = match[0];
    const attrs = match[1];
    let newAttrs = attrs;

    const src = getAttr(attrs, "src");
    const srcset = getAttr(attrs, "srcset");
    const dataSrc = getAttr(attrs, "data-src");

    if (src) {
      try {
        const host = new URL(src.startsWith("http") ? src : `${WP_BASE}${src}`).hostname;
        if (hostnameMatchesWp(host)) {
          const up = await rehost(src);
          if (up) newAttrs = setAttr(newAttrs, "src", up);
        }
      } catch {
        if (src.startsWith("/") || src.startsWith("//")) {
          const up = await rehost(src);
          if (up) newAttrs = setAttr(newAttrs, "src", up);
        }
      }
    }

    if (dataSrc && supabase) {
      const up = await rehost(dataSrc);
      if (up) newAttrs = setAttr(newAttrs, "data-src", up);
    }

    if (srcset && supabase) {
      const parts = srcset.split(",").map((p) => p.trim());
      const rebuilt: string[] = [];
      for (const part of parts) {
        const [urlPart, desc] = part.split(/\s+/, 2);
        if (!urlPart) continue;
        let newUrl = urlPart;
        try {
          const host = new URL(urlPart.startsWith("http") ? urlPart : `${WP_BASE}${urlPart}`).hostname;
          if (hostnameMatchesWp(host)) {
            const up = await rehost(urlPart);
            if (up) newUrl = up;
          }
        } catch {
          if (urlPart.startsWith("/")) {
            const up = await rehost(urlPart);
            if (up) newUrl = up;
          }
        }
        rebuilt.push(desc ? `${newUrl} ${desc}` : newUrl);
      }
      const newSrcset = rebuilt.join(", ");
      if (newSrcset !== srcset) newAttrs = setAttr(newAttrs, "srcset", newSrcset);
    }

    if (newAttrs !== attrs) {
      out = replaceFirst(out, fullTag, `<img${newAttrs}>`);
    }
  }

  return out;
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${WP_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

async function fetchAllPosts(): Promise<WpPost[]> {
  const all: WpPost[] = [];
  let page = 1;
  for (;;) {
    const chunk = await fetchJson<WpPost[]>(
      `/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish&_embed=1`,
    );
    if (!chunk.length) break;
    all.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
  }
  return all;
}

async function fetchWpCategories(): Promise<WpCategory[]> {
  return fetchJson<WpCategory[]>("/wp-json/wp/v2/categories?per_page=100");
}

function pickCategoryId(wpCatIds: number[], wpIdToOurId: Map<number, string>): string | null {
  if (!wpCatIds.length) return null;
  // Prefer non-Uncategorized (WP id 1)
  const sorted = [...wpCatIds].sort((a, b) => {
    if (a === 1) return 1;
    if (b === 1) return -1;
    return 0;
  });
  for (const id of sorted) {
    const cid = wpIdToOurId.get(id);
    if (cid) return cid;
  }
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.log(`WordPress import from ${WP_BASE}${DRY ? " (DRY RUN)" : ""}`);

  const supabase = DRY ? null : getSupabase();
  if (!DRY && !supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for import (or set WORDPRESS_IMPORT_DRY_RUN=1)");
    process.exit(1);
  }

  const author = await prisma.blogAuthor.findFirst({
    where: { email: AUTHOR_EMAIL, isActive: true },
  });
  if (!author) {
    console.error(`No active BlogAuthor with email ${AUTHOR_EMAIL}`);
    process.exit(1);
  }

  const wpCategories = await fetchWpCategories();
  const wpIdToOurId = new Map<number, string>();

  if (!DRY) {
    let order = 100;
    for (const wc of wpCategories) {
      const cat = await prisma.blogCategory.upsert({
        where: { slug: wc.slug },
        update: { name: wc.name },
        create: {
          name: wc.name,
          slug: wc.slug,
          description: "",
          sortOrder: order++,
        },
      });
      wpIdToOurId.set(wc.id, cat.id);
    }
    console.log(`✅ Synced ${wpCategories.length} categories`);
  }

  const posts = await fetchAllPosts();
  console.log(`Fetched ${posts.length} published posts`);

  const urlCache = new Map<string, string>();
  const usedSlugs = new Set(
    (await prisma.blogPost.findMany({ select: { slug: true } })).map((p) => p.slug.toLowerCase()),
  );

  type Planned = {
    wp: WpPost;
    slug: string;
    slugKey: string;
  };

  const planned: Planned[] = [];
  const idToSlug = new Map<number, string>();
  const slugAliases = new Map<string, string>();

  for (const wp of posts) {
    let slug = decodeSlug(wp.slug);
    if (!slug) slug = `post-${wp.id}`;
    let candidate = slug;
    let n = 0;
    const lower = () => candidate.toLowerCase();
    while (usedSlugs.has(lower())) {
      n += 1;
      candidate = `${slug}-wp-${wp.id}${n > 1 ? `-${n}` : ""}`;
    }
    usedSlugs.add(lower());
    planned.push({ wp, slug: candidate, slugKey: lower() });
    idToSlug.set(wp.id, candidate);
    slugAliases.set(decodeSlug(wp.slug).toLowerCase(), candidate);
    slugAliases.set(wp.slug.toLowerCase(), candidate);
  }

  const redirects: { wpLink: string; newUrl: string; wpId: number }[] = [];

  let created = 0;
  let skipped = 0;

  for (const { wp, slug } of planned) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      console.log(`⏭️  Skip (exists): ${slug}`);
      skipped += 1;
      continue;
    }

    let html = cleanupWpComments(wp.content.rendered || "");
    html = await rewriteHtml(html, supabase, urlCache, idToSlug, slugAliases);
    html = sanitizeHtml(html);

    const excerpt = decodeBasicEntities(stripHtml(wp.excerpt.rendered || "")).slice(0, 500);
    const title = decodeBasicEntities(stripHtml(wp.title.rendered)) || `Post ${wp.id}`;

    let featured: string | null = null;
    const emb = wp._embedded?.["wp:featuredmedia"]?.[0];
    if (emb && supabase) {
      const u = pickFeaturedUrl(emb);
      if (u) featured = await uploadImageUrl(supabase, u, urlCache);
    }

    const categoryId = DRY ? null : pickCategoryId(wp.categories, wpIdToOurId);
    const publishedAt = new Date(wp.date);

    redirects.push({
      wpLink: wp.link,
      newUrl: `${SITE_URL}/blog/${encodeURIComponent(slug)}`,
      wpId: wp.id,
    });

    if (DRY) {
      console.log(`[dry] ${title} → /blog/${slug}`);
      continue;
    }

    await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        content: html,
        featuredImage: featured,
        categoryId,
        authorId: author.id,
        status: "published",
        publishedAt,
        metaTitle: title.slice(0, 70),
        metaDescription: excerpt.slice(0, 160) || null,
      },
    });
    created += 1;
    console.log(`✅ ${title}`);
  }

  const outPath = path.join(process.cwd(), "wordpress-import-redirects.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "Use on Vercel or old host to 301 WordPress permalinks to the new site.",
        redirects,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nWrote ${outPath}`);

  console.log(`\nDone. Created: ${created}, skipped: ${skipped}, dry: ${DRY}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

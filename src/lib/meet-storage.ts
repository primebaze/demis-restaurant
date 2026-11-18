/**
 * Files for Demi's Meetings (task and report photos, news photos, handbook
 * documents, call recordings), kept in a PRIVATE Supabase Storage bucket.
 *
 * Browsers upload straight to Storage with a one-time signed URL (Vercel caps a
 * request at 4.5MB), and files are read back through short-lived signed URLs.
 * Uses the same service key as the blog uploads (SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const BUCKET = "meet";
let client: SupabaseClient | null = null;
let bucketChecked = false;

function storage(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function storageReady(): boolean {
  return !!storage();
}

/**
 * Make the private bucket the first time it's needed. The size limit must stay within the
 * project's own upload limit (50MB on Supabase's free plan), or Supabase refuses to make it.
 * Recording pieces are 30 seconds (well under 1MB), so this is only ever a ceiling.
 */
async function ensureBucket(s: SupabaseClient) {
  if (bucketChecked) return;
  const { data } = await s.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await s.storage.createBucket(BUCKET, { public: false, fileSizeLimit: "50MB" });
    if (error && !/already exists/i.test(error.message)) {
      console.error(`[meet-storage] couldn't create the "${BUCKET}" bucket: ${error.message}`);
      return; // try again next time
    }
  }
  bucketChecked = true;
}

const SAFE_EXT = /^[a-z0-9]{1,5}$/;
const ALLOWED: Record<string, string[]> = {
  photo: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
  doc: ["pdf", "jpg", "jpeg", "png", "webp", "docx", "xlsx", "txt"],
  audio: ["webm", "mp4", "m4a", "ogg", "wav"],
};

/**
 * A one-time upload URL for a new file. `kind` limits the file types; the
 * returned path is what gets saved on the task, report, post or recording.
 */
export async function uploadUrl(folder: string, kind: keyof typeof ALLOWED, ext: string): Promise<{ path: string; url: string; token: string } | null> {
  const s = storage();
  if (!s) return null;
  const e = ext.toLowerCase().replace(/^\./, "");
  if (!SAFE_EXT.test(e) || !ALLOWED[kind].includes(e)) return null;
  await ensureBucket(s);
  const path = `${folder.replace(/[^a-z0-9/_-]/gi, "")}/${Date.now()}-${randomBytes(6).toString("hex")}.${e}`;
  const { data, error } = await s.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error(`[meet-storage] no upload URL for ${path}: ${error?.message || "no data"}`);
    return null;
  }
  return { path, url: data.signedUrl, token: data.token };
}

/** A short-lived link to read a stored file. */
export async function readUrl(path: string, seconds = 3600): Promise<string> {
  const s = storage();
  if (!s || !path) return "";
  const { data } = await s.storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl || "";
}

/** Several at once (lists of posts, reports, recordings). */
export async function readUrls(paths: string[], seconds = 3600): Promise<Map<string, string>> {
  const s = storage();
  const out = new Map<string, string>();
  const list = Array.from(new Set(paths.filter(Boolean)));
  if (!s || list.length === 0) return out;
  const { data } = await s.storage.from(BUCKET).createSignedUrls(list, seconds);
  for (const d of data || []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

export async function removeFiles(paths: string[]) {
  const s = storage();
  const list = paths.filter(Boolean);
  if (!s || list.length === 0) return;
  await s.storage.from(BUCKET).remove(list);
}

/** Paths saved on records must be ones this app handed out (no reaching into other folders). */
export function isOurPath(path: unknown, folder: string): path is string {
  return typeof path === "string" && path.startsWith(`${folder}/`) && !path.includes("..") && path.length < 200;
}

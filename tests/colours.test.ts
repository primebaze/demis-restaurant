/**
 * Enforces docs/COLOURS.md. Run with: npm run test:colours
 *
 * Fails when a page uses a colour outside the palette: a hand-typed hex black,
 * a cold grey, or a decorative accent other than gold.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(f)) out.push(p);
  }
  return out;
}

const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");

// Emails use inline hex (email clients can't read Tailwind), so skip the API.
const FILES = walk(SRC)
  .filter((f) => !rel(f).startsWith("src/app/api/"))
  .map((f) => ({ file: rel(f), src: readFileSync(f, "utf8") }));

/** Brand colours that aren't ours. file -> allowed matches, with the reason. */
const ALLOWED: Record<string, { match: RegExp; why: string }[]> = {
  "src/app/blog/[slug]/ShareButtons.tsx": [
    { match: /\[#(25D366|1877F2|0A66C2|E4405F)\]/i, why: "social network brand colours" },
  ],
  "src/app/page.tsx": [
    { match: /(via-pink-500|to-purple-600)/, why: "Instagram icon gradient" },
  ],
};

function offenders(pattern: RegExp) {
  const found: string[] = [];
  for (const { file, src } of FILES) {
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      for (const m of Array.from(line.matchAll(pattern))) {
        if ((ALLOWED[file] || []).some((a) => a.match.test(m[0]))) continue;
        found.push(`${file}:${i + 1}  ${m[0]}`);
      }
    });
  }
  return found;
}

test("no hand-typed hex colours in classes (use ink-*, stone-*, gold-*)", () => {
  const bad = offenders(/\b(?:bg|border|from|to|via|ring|divide|outline|text|fill|stroke|placeholder|shadow)-\[#[0-9a-fA-F]{3,8}\]/g);
  assert.deepEqual(bad, [], `Off-palette hex colours:\n${bad.join("\n")}`);
});

test("greys are warm stone, never gray/slate/zinc/neutral", () => {
  const bad = offenders(/\b(?:gray|slate|zinc|neutral)-(?:50|[1-9]00|950)\b/g);
  assert.deepEqual(bad, [], `Cold greys:\n${bad.join("\n")}`);
});

test("borders and grey fills on dark screens are white at low strength, not solid stone", () => {
  const bad = offenders(/\b(?:(?:border|divide)(?:-[trblxy])?-stone-(?:600|700|800|900)|bg-stone-(?:600|700|800))\b(?:\/\d+)?/g);
  assert.deepEqual(bad, [], `Use border-white/[0.06], border-white/10 or bg-white/[0.06]:\n${bad.join("\n")}`);
});

test("no decorative accent colours (gold is the only accent)", () => {
  const bad = offenders(/\b(?:bg|text|border|from|to|via|ring|fill|stroke)-(?:blue|purple|indigo|pink|sky|cyan|teal|violet|fuchsia|rose|lime|orange|yellow|green)-\d+/g);
  assert.deepEqual(bad, [], `Off-palette accents (use gold, or emerald/amber/red for status):\n${bad.join("\n")}`);
});

test("every guest page uses the same page background", () => {
  const PUBLIC_PAGE = /^src\/app\/(?!admin|blog\/admin|door|brunch-checkin|checkin|shoot-plans)[^]*page\.tsx$/;
  const bad: string[] = [];
  for (const { file, src } of FILES) {
    if (!PUBLIC_PAGE.test(file)) continue;
    for (const m of Array.from(src.matchAll(/min-h-screen bg-(ink-\d+)/g))) {
      if (m[1] !== "ink-900") bad.push(`${file}  ${m[0]}`);
    }
  }
  assert.deepEqual(bad, [], `Guest pages should use bg-ink-900:\n${bad.join("\n")}`);
});

test("the ink palette is defined", () => {
  const cfg = readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8");
  for (const [k, hex] of [["950", "#111111"], ["900", "#1a1a1a"], ["800", "#222222"], ["700", "#2a2a2a"], ["600", "#333333"]]) {
    assert.match(cfg, new RegExp(`${k}: '${hex}'`), `ink-${k} should be ${hex}`);
  }
});

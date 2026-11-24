#!/usr/bin/env node
// Secrets hook helper: scan one saved file for likely secrets.
// Quiet on clean (exit 0, no stdout). On a hit, stderr + exit 1, and the value
// is NEVER printed. Conservative on "long random strings" to avoid false
// positives — tune the thresholds below if it gets noisy.
import fs from "node:fs";

const file = process.argv[2];
if (!file) process.exit(0);

// Skip files where long random strings are expected, or that are not text.
const skipRe =
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$|\.map$|\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|otf|mp4|mov|pdf|zip|gz|tar)$|(^|\/)\.next\//;
if (skipRe.test(file)) process.exit(0);

let src;
try {
  src = fs.readFileSync(file, "utf8");
} catch {
  process.exit(0);
}
if (src.length > 1_000_000) process.exit(0); // skip huge files

// Values that are clearly placeholders/safe, not real secrets.
const safe = /^(changeme|placeholder|example|your[_-]?|xxx+|test|dummy|todo|none|null|undefined|process\.env|env\.)/i;

const patterns = [
  { re: /sk-[A-Za-z0-9]{16,}/, label: "sk- prefixed key" },
  { re: /\bBearer\s+[A-Za-z0-9._\-+/=]{16,}/, label: "Bearer token" },
  {
    re: /\b[A-Za-z0-9_]*(?:KEY|SECRET|TOKEN)[A-Za-z0-9_]*\s*[:=]\s*['"]?([A-Za-z0-9_\-+/=]{12,})['"]?/i,
    label: "KEY/SECRET/TOKEN assignment",
    group: 1,
  },
];

const hits = [];
const lines = src.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  for (const p of patterns) {
    const m = line.match(p.re);
    if (m) {
      const val = p.group ? m[p.group] : m[0];
      if (safe.test(val)) continue;
      hits.push({ line: i + 1, label: p.label });
    }
  }

  // Long high-entropy string: length >= 40 and at least 24 distinct chars.
  // Skips data: URIs and denylisted values. Hex hashes (few distinct chars) are
  // not flagged.
  if (/data:.*;base64,/i.test(line)) continue;
  const lm = line.match(/[A-Za-z0-9+/_\-]{40,}/);
  if (lm && !safe.test(lm[0]) && new Set(lm[0]).size >= 24) {
    hits.push({ line: i + 1, label: "long high-entropy string" });
  }

  if (hits.length >= 5) break;
}

if (hits.length === 0) process.exit(0);

console.error(`[secrets-on-save] Possible secret in ${file}. Do NOT commit.`);
for (const h of hits) console.error(`  line ${h.line}: ${h.label} (value not shown)`);
process.exit(1);

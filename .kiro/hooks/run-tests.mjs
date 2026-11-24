#!/usr/bin/env node
// Tests hook helper: run `npm test`, stay quiet on pass, report failures briefly.
// Quiet on success (exit 0, no stdout). On failure, stderr + exit 1.
// NOTE: this needs the "test" script + Vitest, which are added in task T1.
// Until then `npm test` reports "Missing script" and this prints a setup note.
import { execFileSync } from "node:child_process";

let out = "";
let code = 0;
try {
  out = execFileSync("npm", ["test"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  code = e.status ?? 1;
  out = (e.stdout ?? "") + (e.stderr ?? "");
}

if (code === 0) process.exit(0);

if (/Missing script: "test"/.test(out)) {
  console.error('Tests hook: no "test" script yet — add it in T1 (Vitest + fast-check).');
  process.exit(1);
}

console.error("lib tests failed:");
const lines = out.split("\n").filter((l) => /×|✗|✕|FAIL|failing|expected|Error/i.test(l));
console.error((lines.length ? lines : out.split("\n").filter(Boolean)).slice(-12).join("\n"));
process.exit(1);

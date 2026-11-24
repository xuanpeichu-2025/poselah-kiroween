#!/usr/bin/env node
// Lint hook helper: run `npm run lint`, stay quiet on success, report errors only.
// Quiet on success (exit 0, no stdout). On failure, stderr + exit 1.
import { execFileSync } from "node:child_process";

let out = "";
let code = 0;
try {
  out = execFileSync("npm", ["run", "lint"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  code = e.status ?? 1;
  out = (e.stdout ?? "") + (e.stderr ?? "");
}

if (code === 0) process.exit(0);

console.error("Lint errors:");
const lines = out
  .split("\n")
  .filter((l) => l && !/warning/i.test(l) && !/^>/.test(l));
console.error((lines.length ? lines : out.split("\n").filter(Boolean)).slice(-25).join("\n"));
process.exit(1);

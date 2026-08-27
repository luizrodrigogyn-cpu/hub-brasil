import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
const ignored = new Set(["package-lock.json", "scripts/scan-secrets.mjs"]);
const binaryExtensions = /\.(?:png|jpe?g|gif|webp|ico|woff2?|pdf|docx|zip)$/i;
const rules = [
  { name: "Clerk secret key", pattern: /\bsk_(?:live|test)_[A-Za-z0-9_-]{20,}\b/g },
  { name: "GitHub token", pattern: /\bgh[oprsu]_[A-Za-z0-9]{30,}\b/g },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "Cloudflare API token assignment", pattern: /CLOUDFLARE_API_TOKEN\s*=\s*["']?[A-Za-z0-9_-]{20,}/g },
];

const findings = [];
for (const file of files) {
  if (ignored.has(file) || binaryExtensions.test(file)) continue;
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(content)) findings.push(`${file}: ${rule.name}`);
  }
}

if (findings.length) {
  console.error("Possíveis segredos encontrados em arquivos versionados:\n" + findings.join("\n"));
  process.exit(1);
}
console.log(`Varredura concluída: ${files.length} arquivos versionados, nenhum segredo conhecido encontrado.`);

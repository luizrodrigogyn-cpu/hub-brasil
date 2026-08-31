import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";

const distDirectory = fileURLToPath(new URL("../dist/", import.meta.url));

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return findJavaScriptFiles(file);
    return entry.isFile() && entry.name.endsWith(".js") ? [file] : [];
  }));
  return files.flat();
}

test("empacota a experiência do Hub Brasil", async () => {
  const files = await findJavaScriptFiles(distDirectory);
  assert.ok(files.length > 0, "A saída compilada não contém arquivos JavaScript.");

  // O Worker importado usa o módulo nativo cloudflare:workers, indisponível no
  // processo Node do CI. Validamos o pacote já construído, que é o mesmo usado
  // pelo deploy no Worker, sem substituir nem simular o runtime da Cloudflare.
  const bundle = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

  assert.match(bundle, /Hub Brasil/);
  assert.match(bundle, /tecnologia confiável/);
  assert.match(bundle, /Fornecedores/);
  assert.match(bundle, /Videotelemetria/);
  assert.match(bundle, /Pronto para encontrar a solução certa/);
  assert.match(bundle, /Indicar o Hub/);
  assert.match(bundle, /Para quem é o Hub Brasil/);
  assert.match(bundle, /Sobre o Hub/);
  assert.match(bundle, /Eventos/);
  assert.match(bundle, /Radar do Setor/);
  assert.doesNotMatch(bundle, /codex-preview/);
});

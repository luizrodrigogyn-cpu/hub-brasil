import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renderiza a experiência do Hub Brasil", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Hub Brasil/);
  assert.match(html, /Encontre os melhores fornecedores/);
  assert.match(html, /Fornecedores/);
  assert.match(html, /Videotelemetria/);
  assert.match(html, /Indique o Hub aos seus parceiros do setor/);
  assert.match(html, /Eventos/);
  assert.match(html, /Radar do Setor/);
  assert.doesNotMatch(html, /codex-preview/);
});

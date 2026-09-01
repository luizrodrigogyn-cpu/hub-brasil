import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("cockpit apresenta skeleton acessível enquanto carrega dados reais", () => {
  assert.match(page, /dashboardLoading/);
  assert.match(page, /aria-busy=\{dashboardLoading\}/);
  assert.match(page, /Carregando seu painel comercial/);
  assert.match(css, /\.cockpit-skeleton\{/);
});

test("ação de oportunidade mantém o modal aberto quando a gravação falha", () => {
  assert.match(page, /if \(await respondQuote\(selectedOpportunity\.id, "responded"\)\) setSelectedOpportunity\(null\)/);
  assert.match(page, /A oportunidade continua disponível para você tentar novamente/);
  assert.match(page, /return false/);
});

test("acabamento responde ao mobile e respeita movimento reduzido", () => {
  assert.match(css, /@media\(max-width:760px\)\{\.cockpit-skeleton/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.skeleton-line/);
  assert.match(css, /:focus-visible\{/);
  assert.match(css, /@keyframes toast-arrival/);
});

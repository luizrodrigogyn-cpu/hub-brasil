import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessConversation,
  canManageClientQuote,
  canManageSupplierResource,
  canRespondToSupplierQuote,
} from "../app/access-policy.mjs";

const clientA = { userId: "user_a" };
const clientB = { userId: "user_b" };
const supplierA = { userId: "supplier_user_a" };
const supplierB = { userId: "supplier_user_b" };
const clientProfileA = { id: 10, role: "client" };
const clientProfileB = { id: 11, role: "client" };
const supplierProfileA = { id: 20, role: "supplier" };
const supplierProfileB = { id: 21, role: "supplier" };

test("cliente B nunca acessa a conversa do cliente A", () => {
  const conversation = { clientUserId: clientA.userId, supplierId: supplierProfileA.id };
  assert.equal(canAccessConversation(clientA, clientProfileA, conversation), true);
  assert.equal(canAccessConversation(clientB, clientProfileB, conversation), false);
});

test("fornecedor B nunca acessa a conversa do fornecedor A", () => {
  const conversation = { clientUserId: clientA.userId, supplierId: supplierProfileA.id };
  assert.equal(canAccessConversation(supplierA, supplierProfileA, conversation), true);
  assert.equal(canAccessConversation(supplierB, supplierProfileB, conversation), false);
});

test("cliente B nunca encerra a cotação do cliente A", () => {
  const quote = { clientUserId: clientA.userId };
  assert.equal(canManageClientQuote(clientA, quote), true);
  assert.equal(canManageClientQuote(clientB, quote), false);
});

test("fornecedor B nunca responde a oportunidade do fornecedor A", () => {
  const recipient = { supplierId: supplierProfileA.id };
  assert.equal(canRespondToSupplierQuote(supplierProfileA, recipient), true);
  assert.equal(canRespondToSupplierQuote(supplierProfileB, recipient), false);
});

test("fornecedor B nunca altera produto do fornecedor A", () => {
  const product = { supplierId: supplierProfileA.id, ownerUserId: supplierA.userId };
  assert.equal(canManageSupplierResource(supplierA, product, supplierProfileA), true);
  assert.equal(canManageSupplierResource(supplierB, product, supplierProfileB), false);
});

test("acesso é negado quando sessão, perfil ou recurso não existem", () => {
  assert.equal(canAccessConversation(null, clientProfileA, { clientUserId: clientA.userId, supplierId: 20 }), false);
  assert.equal(canManageClientQuote(clientA, null), false);
  assert.equal(canRespondToSupplierQuote(null, { supplierId: 20 }), false);
});

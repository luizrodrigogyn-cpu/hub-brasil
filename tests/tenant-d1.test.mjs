import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE organization_members (organization_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL, UNIQUE(organization_id,user_id));
    CREATE TABLE products (id INTEGER PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL);
    CREATE TABLE quote_requests (id INTEGER PRIMARY KEY, client_organization_id TEXT NOT NULL, status TEXT NOT NULL);
    CREATE TABLE conversations (id INTEGER PRIMARY KEY, client_organization_id TEXT NOT NULL, supplier_organization_id TEXT NOT NULL);
    CREATE TABLE conversation_messages (id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL, sender_organization_id TEXT NOT NULL, body TEXT NOT NULL);
    CREATE TABLE organization_features (organization_id TEXT NOT NULL, feature_key TEXT NOT NULL, enabled INTEGER NOT NULL, UNIQUE(organization_id, feature_key));
    INSERT INTO organizations VALUES ('org-a','Cliente A'),('org-b','Cliente B');
    INSERT INTO organization_members VALUES ('org-a','user-a','active'),('org-b','user-b','active');
    INSERT INTO products VALUES (1,'org-a','Produto A'),(2,'org-b','Produto B');
    INSERT INTO quote_requests VALUES (1,'org-a','open'),(2,'org-b','open');
    INSERT INTO conversations VALUES (1,'org-a','org-b'),(2,'org-b','org-b');
    INSERT INTO conversation_messages VALUES (1,1,'org-a','Mensagem A'),(2,2,'org-b','Mensagem B');
    INSERT INTO organization_features VALUES ('org-a','messages',1),('org-b','messages',0);
  `);
  return db;
}

test("D1/SQLite: organização A não lê dados privados de B", () => {
  const db = fixture();
  assert.deepEqual(db.prepare("SELECT name FROM products WHERE organization_id=? ORDER BY id").all("org-a").map((row) => row.name), ["Produto A"]);
  assert.deepEqual(db.prepare("SELECT id FROM quote_requests WHERE client_organization_id=?").all("org-a").map((row) => row.id), [1]);
  assert.deepEqual(db.prepare("SELECT body FROM conversation_messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.client_organization_id=? OR c.supplier_organization_id=? ORDER BY m.id").all("org-a", "org-a").map((row) => row.body), ["Mensagem A"]);
});

test("D1/SQLite: update e delete de A não alteram B", () => {
  const db = fixture();
  const update = db.prepare("UPDATE quote_requests SET status='closed' WHERE id=? AND client_organization_id=?").run(2, "org-a");
  const deletion = db.prepare("DELETE FROM products WHERE id=? AND organization_id=?").run(2, "org-a");
  assert.equal(update.changes, 0);
  assert.equal(deletion.changes, 0);
  assert.equal(db.prepare("SELECT status FROM quote_requests WHERE id=2").get().status, "open");
  assert.equal(db.prepare("SELECT name FROM products WHERE id=2").get().name, "Produto B");
});

test("D1/SQLite: módulos podem ser ligados por organização sem vazar configuração", () => {
  const db = fixture();
  assert.equal(db.prepare("SELECT enabled FROM organization_features WHERE organization_id=? AND feature_key=?").get("org-a", "messages").enabled, 1);
  assert.equal(db.prepare("SELECT enabled FROM organization_features WHERE organization_id=? AND feature_key=?").get("org-b", "messages").enabled, 0);
});

import { runtimeValue } from "./runtime-env";

const prefix = "enc:v1:";
let cachedKey: Promise<CryptoKey> | null = null;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptionKey() {
  if (!cachedKey) cachedKey = (async () => {
    const encoded = runtimeValue("PII_ENCRYPTION_KEY");
    if (!encoded) throw new Error("PII_ENCRYPTION_KEY_NOT_CONFIGURED");
    const raw = base64ToBytes(encoded);
    if (raw.byteLength !== 32) throw new Error("PII_ENCRYPTION_KEY_INVALID");
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  })();
  return cachedKey;
}

export async function encryptPii(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith(prefix)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(value)));
  return `${prefix}${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

export async function decryptPii(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith(prefix)) return value;
  const [ivEncoded, ciphertextEncoded] = value.slice(prefix.length).split(":");
  if (!ivEncoded || !ciphertextEncoded) throw new Error("PII_CIPHERTEXT_INVALID");
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(ivEncoded) }, await encryptionKey(), base64ToBytes(ciphertextEncoded));
  return new TextDecoder().decode(clear);
}

export async function blindIndex(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized)));
  return bytesToBase64(digest);
}

export async function decryptLeadPii<T extends Record<string, unknown>>(lead: T) {
  return {
    ...lead,
    phone: await decryptPii(String(lead.phoneEncrypted || lead.phone || "")),
    email: await decryptPii(lead.emailEncrypted ? String(lead.emailEncrypted) : lead.email ? String(lead.email) : null),
    address: await decryptPii(lead.addressEncrypted ? String(lead.addressEncrypted) : lead.address ? String(lead.address) : null),
    cnpj: await decryptPii(lead.cnpjEncrypted ? String(lead.cnpjEncrypted) : lead.cnpj ? String(lead.cnpj) : null),
    instagram: await decryptPii(lead.instagramEncrypted ? String(lead.instagramEncrypted) : lead.instagram ? String(lead.instagram) : null),
  };
}

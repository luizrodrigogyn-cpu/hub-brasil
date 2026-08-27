/**
 * Camada central de isolamento do Hub Brasil.
 *
 * O identificador do ator sempre vem da sessão validada pelo Clerk. IDs
 * recebidos pelo formulário servem apenas para localizar um recurso; nunca
 * concedem acesso por si mesmos.
 */

/** @typedef {{ userId: string }} Actor */
/** @typedef {{ id: number, role: string }} Profile */
/** @typedef {{ clientUserId: string, supplierId: number }} ConversationScope */

/**
 * @param {Actor | null | undefined} actor
 * @param {Profile | null | undefined} profile
 * @param {ConversationScope | null | undefined} conversation
 */
export function canAccessConversation(actor, profile, conversation) {
  if (!actor?.userId || !profile || !conversation) return false;
  if (profile.role === "client") return conversation.clientUserId === actor.userId;
  if (profile.role === "supplier") return conversation.supplierId === profile.id;
  return false;
}

/**
 * @param {Actor | null | undefined} actor
 * @param {{ clientUserId: string } | null | undefined} quote
 */
export function canManageClientQuote(actor, quote) {
  return Boolean(actor?.userId && quote && quote.clientUserId === actor.userId);
}

/**
 * @param {Profile | null | undefined} profile
 * @param {{ supplierId: number } | null | undefined} recipient
 */
export function canRespondToSupplierQuote(profile, recipient) {
  return Boolean(profile?.role === "supplier" && recipient && recipient.supplierId === profile.id);
}

/**
 * @param {Actor | null | undefined} actor
 * @param {{ ownerUserId?: string | null, supplierId?: number | null } | null | undefined} resource
 * @param {Profile | null | undefined} profile
 */
export function canManageSupplierResource(actor, resource, profile) {
  if (!actor?.userId || profile?.role !== "supplier" || !resource) return false;
  return resource.supplierId === profile.id || resource.ownerUserId === actor.userId;
}

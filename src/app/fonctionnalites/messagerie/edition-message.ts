/** Règle du back (contrat 1.13.0), comme sur WhatsApp : l'auteur modifie son message pendant 15 minutes. */
export const DELAI_MODIFICATION_MS = 15 * 60_000;

/** Vrai si le message peut encore être modifié par son auteur (le back reste seul juge, il renvoie 400 sinon). */
export function encoreModifiable(m: { createdAt?: string; deleted?: boolean }, maintenant = Date.now()): boolean {
  if (m.deleted || !m.createdAt) return false;
  return maintenant - new Date(m.createdAt).getTime() < DELAI_MODIFICATION_MS;
}

export const ERREURS_MODIFICATION: Record<number, string> = {
  400: "Ce message ne peut plus être modifié : le délai de 15 minutes après l'envoi est dépassé.",
  403: 'Vous ne pouvez modifier que vos propres messages.',
  404: "Ce message n'existe plus.",
};

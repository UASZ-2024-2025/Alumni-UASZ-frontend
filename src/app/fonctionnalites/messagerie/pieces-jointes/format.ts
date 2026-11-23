import { AttachmentKind } from '../../../api/generes/notifications-messagerie/model/attachmentKind';
import { GroupMessageType } from '../../../api/generes/notifications-messagerie/model/groupMessageType';

/** Extension en minuscules, sans le point (« Rapport.PDF » → « pdf »). */
export const extension = (nom = ''): string => (nom.includes('.') ? (nom.split('.').pop() ?? '').toLowerCase() : '');

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Taille lisible : « 350 Ko », « 1,2 Mo ». */
export function taille(octets?: number): string {
  if (!octets) return '';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${nombre.format(octets / (1024 * 1024))} Mo`;
}

/** Durée d'un vocal : « 0:07 », « 1:45 ». */
export function duree(secondes?: number): string {
  const s = Math.max(0, Math.round(secondes ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const LIBELLES: Record<AttachmentKind, { icone: string; libelle: string }> = {
  IMAGE: { icone: '📷', libelle: 'Photo' },
  FILE: { icone: '📄', libelle: 'Document' },
  AUDIO: { icone: '🎤', libelle: 'Message vocal' },
};

/**
 * Texte du dernier message dans la liste des discussions, comme WhatsApp :
 * « 📷 Photo » (ou « 📷 <légende> »), « 📄 Document », « 🎤 Message vocal », « Sticker ».
 */
export function texteDernierMessage(type?: GroupMessageType, kind?: AttachmentKind, contenu?: string): string {
  if (type === 'STICKER') return 'Sticker';
  if (type === 'ATTACHMENT') {
    const l = kind ? LIBELLES[kind] : { icone: '📎', libelle: 'Pièce jointe' };
    return `${l.icone} ${kind !== 'AUDIO' && contenu ? contenu : l.libelle}`;
  }
  return contenu ?? '';
}

/**
 * ALUM-262 : stickers de la messagerie, dessins originaux servis depuis `public/stickers/<code>.svg`.
 * Le message ne transporte que le code (`sticker`, motif `^[a-z0-9-]{1,40}$` du contrat).
 */
export interface Sticker {
  code: string;
  libelle: string;
}

export const STICKERS: readonly Sticker[] = [
  { code: 'bravo', libelle: 'Bravo !' },
  { code: 'merci', libelle: 'Merci' },
  { code: 'diplome', libelle: 'Diplômé·e' },
  { code: 'felicitations', libelle: 'Félicitations' },
  { code: 'ok', libelle: 'OK' },
  { code: 'rire', libelle: 'Mdr' },
  { code: 'cafe', libelle: 'Pause café' },
  { code: 'bonne-chance', libelle: 'Bonne chance' },
  { code: 'salut', libelle: 'Salut !' },
  { code: 'a-bientot', libelle: 'À bientôt' },
  { code: 'stage', libelle: 'Stage trouvé !' },
  { code: 'teranga', libelle: 'Teranga' },
];

const PAR_CODE = new Map(STICKERS.map((s) => [s.code, s]));

/** Sticker connu de cette version de l'écran, ou undefined (code envoyé par une version plus récente). */
export const stickerParCode = (code?: string): Sticker | undefined => (code ? PAR_CODE.get(code) : undefined);

export const imageSticker = (code: string): string => `stickers/${code}.svg`;

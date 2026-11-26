import { Injectable } from '@angular/core';

/** Formats acceptés par le serveur (ALUM-255), contrôlés aussi côté écran pour un message immédiat. */
export const FORMATS_PHOTO = ['image/jpeg', 'image/png'] as const;
export const TAILLE_MAX_PHOTO_MO = 2;

/** Côté du carré produit pour l'aperçu et le PDF, en pixels : net à l'impression, léger en mémoire. */
const COTE_PX = 480;

/** Message d'erreur si le fichier ne peut pas servir de photo, `null` s'il convient. */
export function verifierPhoto(fichier: File): string | null {
  if (!(FORMATS_PHOTO as readonly string[]).includes(fichier.type)) {
    return 'Format non accepté : choisissez une image JPEG ou PNG.';
  }
  if (fichier.size > TAILLE_MAX_PHOTO_MO * 1024 * 1024) {
    return `La photo dépasse ${TAILLE_MAX_PHOTO_MO} Mo.`;
  }
  return null;
}

/**
 * Prépare la photo du CV (ALUM-256) : recadrage carré centré, sans déformation, réduit à 480 px de côté.
 * Le résultat (data URL JPEG) sert à la fois à l'aperçu et au PDF, qui l'affichent dans un cercle.
 */
@Injectable({ providedIn: 'root' })
export class PhotoCvService {
  async carree(image: Blob): Promise<string> {
    const bitmap = await createImageBitmap(image);
    try {
      const cote = Math.min(bitmap.width, bitmap.height);
      const sortie = Math.min(cote, COTE_PX);
      const canvas = document.createElement('canvas');
      canvas.width = sortie;
      canvas.height = sortie;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponible');
      // Fond blanc : un PNG transparent ne devient pas noir une fois converti en JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sortie, sortie);
      ctx.drawImage(
        bitmap,
        (bitmap.width - cote) / 2,
        (bitmap.height - cote) / 2,
        cote,
        cote,
        0,
        0,
        sortie,
        sortie,
      );
      return canvas.toDataURL('image/jpeg', 0.9);
    } finally {
      bitmap.close();
    }
  }
}

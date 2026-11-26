import { describe, expect, it } from 'vitest';
import { verifierPhoto } from './photo-cv.service';

const fichier = (type: string, taille: number) =>
  new File([new Uint8Array(taille)], 'photo', { type });

describe('verifierPhoto (ALUM-256)', () => {
  it('accepte un JPEG ou un PNG de 2 Mo au plus', () => {
    expect(verifierPhoto(fichier('image/jpeg', 1000))).toBeNull();
    expect(verifierPhoto(fichier('image/png', 2 * 1024 * 1024))).toBeNull();
  });

  it('refuse les autres formats avec un message clair', () => {
    expect(verifierPhoto(fichier('image/gif', 1000))).toBe(
      'Format non accepté : choisissez une image JPEG ou PNG.',
    );
    expect(verifierPhoto(fichier('application/pdf', 1000))).toContain('JPEG ou PNG');
  });

  it('refuse une image de plus de 2 Mo', () => {
    expect(verifierPhoto(fichier('image/png', 2 * 1024 * 1024 + 1))).toBe('La photo dépasse 2 Mo.');
  });
});

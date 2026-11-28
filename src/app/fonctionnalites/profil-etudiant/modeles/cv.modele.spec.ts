import { describe, expect, it } from 'vitest';
import { CvResponse } from '../../../api/generes/alumni/model/cvResponse';
import { cvInitial, depuisCvEnregistre, MODELE_PAR_DEFAUT, MODELES_CV, modeleCv, versRequeteCv } from './cv.modele';

describe('modèles de CV', () => {
  it('propose au moins trois modèles, aux codes distincts', () => {
    const codes = MODELES_CV.map((m) => m.code);
    expect(codes.length).toBeGreaterThanOrEqual(3);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('désigne ses couleurs par des variables de la charte, jamais par une valeur', () => {
    for (const m of MODELES_CV) expect(m.accent).toMatch(/^--[a-z0-9-]+$/);
  });

  it('retrouve un modèle par son code', () => {
    expect(modeleCv('CLASSIC').code).toBe('CLASSIC');
    expect(modeleCv('UASZ_VERT').libelle).toBe('UASZ (vert)');
  });

  it.each([undefined, null, '', 'INCONNU'])('un code « %s » donne le modèle par défaut', (code) => {
    expect(modeleCv(code).code).toBe(MODELE_PAR_DEFAUT);
  });
});

describe('modèle choisi : enregistrement et relecture', () => {
  const base = cvInitial(null, null);
  const cv = (template?: string) => ({ title: 'Dev', template, language: 'Français' }) as CvResponse;

  it('un nouveau CV démarre sur le modèle par défaut', () => {
    expect(base.modele).toBe(MODELE_PAR_DEFAUT);
  });

  it.each(MODELES_CV.map((m) => m.code))('retrouve le modèle %s enregistré', (code) => {
    expect(depuisCvEnregistre(cv(code), base).modele).toBe(code);
  });

  it('envoie le modèle choisi au back (champ template)', () => {
    expect(versRequeteCv({ ...base, titre: 'Dev', modele: 'CLASSIC' }).template).toBe('CLASSIC');
  });

  it('un modèle inconnu du front est remplacé par le modèle par défaut', () => {
    expect(depuisCvEnregistre(cv('ANCIEN_MODELE'), base).modele).toBe(MODELE_PAR_DEFAUT);
  });

  it('sans modèle enregistré, garde celui du CV de départ', () => {
    expect(depuisCvEnregistre(cv(undefined), { ...base, modele: 'UASZ_VERT' }).modele).toBe('UASZ_VERT');
  });
});

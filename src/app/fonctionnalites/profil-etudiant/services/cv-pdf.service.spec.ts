import { TestBed } from '@angular/core/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cvInitial, DonneesCv, ignorerLignesVides, MODELES_CV, nomFichierPdf, versRequeteCv } from '../modeles/cv.modele';
import { CvPdfService, versLatin } from './cv-pdf.service';
import { Rvb, versRvb } from './couleurs-charte';

/** Variables de la charte (src/styles/_variables.scss) : les tests n'ont pas la feuille de styles de l'application. */
const CHARTE: Record<string, string> = {
  '--g0': '#f3f8f5',
  '--g8': '#0b5d3b',
  '--sf': '#ffffff',
  '--tx': '#14231b',
  '--mu': '#5b6b62',
  '--cv-bleu': '#1d4f91',
};
beforeAll(() => Object.entries(CHARTE).forEach(([nom, valeur]) => document.documentElement.style.setProperty(nom, valeur)));
afterAll(() => Object.keys(CHARTE).forEach((nom) => document.documentElement.style.removeProperty(nom)));

/** Couleurs de remplissage et de trait écrites dans le PDF (opérateurs rg/RG), en 0-255. jsPDF les arrondit à 2 ou 3 décimales. */
function couleursPdf(contenu: string): Rvb[] {
  const nombre = '(\\d+\\.?\\d*|\\.\\d+)';
  const motif = new RegExp(`${nombre} ${nombre} ${nombre} (?:rg|RG)\\b`, 'g');
  return [...contenu.matchAll(motif)].map((m) => [1, 2, 3].map((i) => Math.round(Number(m[i]) * 255)) as Rvb);
}

/** Le PDF utilise-t-il cette couleur (à 2 près par canal, à cause de l'arrondi de jsPDF) ? */
const utilise = (couleurs: Rvb[], [r, g, b]: Rvb) => couleurs.some((c) => Math.abs(c[0] - r) <= 2 && Math.abs(c[1] - g) <= 2 && Math.abs(c[2] - b) <= 2);

async function texte(blob: Blob): Promise<string> {
  const buf = await new Promise<ArrayBuffer>((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as ArrayBuffer);
    r.onerror = () => ko(r.error);
    r.readAsArrayBuffer(blob);
  });
  return new TextDecoder('latin1').decode(buf);
}

function donnees(modele = 'MODERN_BLUE'): DonneesCv {
  return {
    ...cvInitial(null, null),
    prenom: 'Awa',
    nom: 'Diop',
    email: 'awa.diop@uasz.sn',
    titre: 'Développeuse Java',
    modele,
    resume: 'Étudiante en génie logiciel, passionnée par le cloud.',
    competences: ['Java', 'Spring Boot', 'Docker'],
    experiences: [
      { companyName: 'Orange', position: 'Stagiaire', startDate: '2025-07-01', endDate: '2025-09-01', description: 'API REST' },
    ],
    formations: [
      { institution: 'UASZ', degree: 'Master', fieldOfStudy: 'Génie Logiciel', startDate: '2024-10-01', endDate: '' },
    ],
  };
}

describe('CvPdfService', () => {
  const service = TestBed.inject(CvPdfService);

  it('produit un vrai PDF contenant le texte du CV', async () => {
    const blob = await service.generer(donnees());
    const contenu = await texte(blob);

    expect(blob.type).toBe('application/pdf');
    expect(contenu.startsWith('%PDF-')).toBe(true);
    expect(contenu).toContain('Awa Diop');
    expect(contenu).toContain('Spring Boot');
    expect(contenu).toContain('Orange');
  });

  it.each(['MODERN_BLUE', 'UASZ_VERT', 'CLASSIC', 'INCONNU'])('génère le modèle %s', async (modele) => {
    const blob = await service.generer(donnees(modele));
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('passe à une nouvelle page quand le contenu est long', async () => {
    const d = donnees();
    d.experiences = Array.from({ length: 15 }, (_, i) => ({
      companyName: `Entreprise ${i}`,
      position: 'Développeur',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      description: 'Mission détaillée. '.repeat(40),
    }));
    const contenu = await texte(await service.generer(d));

    expect((contenu.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });

  it('ne plante pas avec un CV presque vide', async () => {
    const blob = await service.generer({ ...cvInitial(null, null), titre: 'CV' });
    expect(blob.size).toBeGreaterThan(500);
  });

  describe('le PDF reprend le modèle choisi', () => {
    const charte = (variable: string) => versRvb(CHARTE[variable])!;
    const BLEU = charte('--cv-bleu');
    const VERT = charte('--g8');
    const COLONNE_CLAIRE = charte('--g0'); // propre au modèle classique
    const couleurs = async (modele: string) => couleursPdf(await texte(await service.generer(donnees(modele))));

    it('Moderne : accent bleu, colonne pleine', async () => {
      const c = await couleurs('MODERN_BLUE');
      expect(utilise(c, BLEU)).toBe(true);
      expect(utilise(c, VERT)).toBe(false);
      expect(utilise(c, COLONNE_CLAIRE)).toBe(false);
    });

    it('UASZ : accent vert, colonne pleine', async () => {
      const c = await couleurs('UASZ_VERT');
      expect(utilise(c, VERT)).toBe(true);
      expect(utilise(c, BLEU)).toBe(false);
      expect(utilise(c, COLONNE_CLAIRE)).toBe(false);
    });

    it('Classique : colonne claire, ni bleu ni vert', async () => {
      const c = await couleurs('CLASSIC');
      expect(utilise(c, COLONNE_CLAIRE)).toBe(true);
      expect(utilise(c, BLEU)).toBe(false);
      expect(utilise(c, VERT)).toBe(false);
    });

    it('un modèle inconnu retombe sur le modèle par défaut', async () => {
      expect(utilise(await couleurs('INCONNU'), BLEU)).toBe(true);
    });

    it('prend les couleurs dans la charte, pas dans le code', async () => {
      document.documentElement.style.setProperty('--cv-bleu', '#ff0000');
      try {
        const c = await couleurs('MODERN_BLUE');
        expect(utilise(c, [255, 0, 0])).toBe(true);
        expect(utilise(c, BLEU)).toBe(false);
      } finally {
        document.documentElement.style.setProperty('--cv-bleu', CHARTE['--cv-bleu']);
      }
    });
  });

  describe.each(MODELES_CV.map((m) => m.code))('longueurs de CV, modèle %s (ALUM-228)', (modele) => {
    const pages = async (d: DonneesCv) => (await texte(await service.generer(d))).match(/\/Type\s*\/Page\b(?!s)/g)?.length ?? 0;
    const experiences = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        companyName: `Entreprise ${i + 1}`,
        position: `Poste ${i + 1}`,
        startDate: '2024-01-01',
        endDate: '2024-12-01',
        description: 'Mission détaillée. '.repeat(14),
      }));

    it('un CV court tient sur 1 page', async () => {
      expect(await pages({ ...donnees(modele), interets: ['Football', 'Lecture'] })).toBe(1);
    });

    it('un CV moyen tient sur 2 pages au plus', async () => {
      expect(await pages({ ...donnees(modele), experiences: experiences(5) })).toBeLessThanOrEqual(2);
    });

    it('un CV long est réduit pour rester sur 2 pages et garde tout son contenu', async () => {
      const d = { ...donnees(modele), experiences: experiences(9) };
      expect(await pages(d)).toBeLessThanOrEqual(2);
      const contenu = await texte(await service.generer(d));
      expect(contenu).toContain('Entreprise 9');
    });

    it('garde toute la colonne gauche (30 compétences et 30 centres d’intérêt) sur 2 pages au plus', async () => {
      const d = {
        ...donnees(modele),
        competences: Array.from({ length: 30 }, (_, i) => `Compétence${i + 1}`),
        interets: Array.from({ length: 30 }, (_, i) => `Intérêt${i + 1}`),
      };
      const contenu = await texte(await service.generer(d));
      expect(await pages(d)).toBeLessThanOrEqual(2);
      expect(contenu).toContain('Compétence30');
      expect(contenu).toContain('Intérêt30');
    });

    it('affiche les centres d’intérêt', async () => {
      expect(await texte(await service.generer({ ...donnees(modele), interets: ['Échecs'] }))).toContain('CENTRES D');
    });
  });
});

describe('modèles du CV', () => {
  it('retire les caractères que le PDF ne sait pas écrire', () => {
    expect(versLatin('Café 😀 – œuvre ✓')).toBe('Café  – œuvre ');
  });

  it('nomme le fichier sans accent ni espace', () => {
    expect(nomFichierPdf({ ...cvInitial(null, null), prenom: 'Aïssatou', nom: 'Ndiaye Sow' })).toBe('CV_Aissatou_Ndiaye_Sow.pdf');
  });

  it('ignore les lignes vides dans l’aperçu et le PDF', async () => {
    const d = donnees();
    d.langues = [{ language: '', proficiency: 'Intermédiaire' }];
    d.experiences.push({ companyName: '', position: '', startDate: '', endDate: '', description: '' });
    const nettoye = ignorerLignesVides(d);

    expect(nettoye.langues).toHaveLength(0);
    expect(nettoye.experiences).toHaveLength(1);
    expect(await texte(await TestBed.inject(CvPdfService).generer(d))).not.toContain('Intermédiaire');
  });

  it('ignore les lignes vides dans la requête', () => {
    const d = donnees();
    d.experiences.push({ companyName: '', position: '', startDate: '', endDate: '', description: '' });
    d.langues.push({ language: '  ', proficiency: '' });
    const r = versRequeteCv(d);

    expect(r.experiences).toHaveLength(1);
    expect(r.languages).toHaveLength(1);
    expect(r.educations[0].endDate).toBeUndefined();
  });
});

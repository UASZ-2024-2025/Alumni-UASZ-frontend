import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { cvInitial, DonneesCv, ignorerLignesVides, nomFichierPdf, versRequeteCv } from '../modeles/cv.modele';
import { CvPdfService, versLatin } from './cv-pdf.service';

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

  describe('longueurs de CV (ALUM-228)', () => {
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
      expect(await pages({ ...donnees(), interets: ['Football', 'Lecture'] })).toBe(1);
    });

    it('un CV moyen tient sur 2 pages au plus', async () => {
      expect(await pages({ ...donnees(), experiences: experiences(5) })).toBeLessThanOrEqual(2);
    });

    it('un CV long est réduit pour rester sur 2 pages et garde tout son contenu', async () => {
      const d = { ...donnees(), experiences: experiences(9) };
      expect(await pages(d)).toBeLessThanOrEqual(2);
      const contenu = await texte(await service.generer(d));
      expect(contenu).toContain('Entreprise 9');
    });

    it('affiche les centres d’intérêt', async () => {
      expect(await texte(await service.generer({ ...donnees(), interets: ['Échecs'] }))).toContain('CENTRES D');
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

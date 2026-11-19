import { FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { datesCoherentes } from '../profil-alumni/pages/profil-alumni';
import { formaterDate } from '../profil-etudiant/modeles/cv.modele';
import { carteAlumni, carteEntreprise, carteEtudiant, initiales, ongletValide } from './modeles/cartes';
import { trierExperiences } from './pages/fiche-alumni';

describe('cartes de l’annuaire', () => {
  it('résume un étudiant disponible', () => {
    const c = carteEtudiant({
      id: 's1', firstName: 'Awa', lastName: 'Diop', specialty: 'Génie Logiciel', academicYear: 2026,
      skills: ['Java', 'Docker', 'SQL', 'Angular', 'Go'], availabilityStatus: 'AVAILABLE_FOR_INTERNSHIP',
    });
    expect(c.titre).toBe('Awa Diop');
    expect(c.sousTitre).toBe('Génie Logiciel · Promotion 2026');
    expect(c.badge?.texte).toBe('Disponible pour un stage');
    expect(c.etiquettes).toHaveLength(4);
    expect(c.lien).toEqual(['/annuaire', 'etudiants', 's1']);
  });

  it('n’affiche pas de badge pour un étudiant non disponible', () => {
    expect(carteEtudiant({ id: 's2', availabilityStatus: 'NOT_AVAILABLE' }).badge).toBeUndefined();
  });

  it('résume un Alumni et une entreprise partenaire', () => {
    const a = carteAlumni({ id: 'a1', firstName: 'Moussa', lastName: 'Fall', currentPosition: 'DevOps', currentCompany: 'Orange', graduationYear: 2023 });
    expect(a.sousTitre).toBe('DevOps chez Orange');
    expect(a.details).toContain('Promotion 2023');
    const c = carteEntreprise({ id: 'c1', name: 'Sonatel', sector: 'Télécoms', isPartner: true });
    expect(c.badge?.texte).toBe('Partenaire');
  });

  it('gère les noms vides et les initiales', () => {
    expect(carteEtudiant({ id: 'x' }).titre).toBe('Sans nom');
    expect(initiales('Awa Diop')).toBe('AD');
    expect(initiales('Sonatel')).toBe('S');
    expect(initiales('')).toBe('?');
  });

  it('retombe sur l’onglet étudiants si le paramètre est invalide', () => {
    expect(ongletValide('alumni')).toBe('alumni');
    expect(ongletValide('piratage')).toBe('etudiants');
    expect(ongletValide(null)).toBe('etudiants');
  });
});

describe('dates', () => {
  it('formate une date en français', () => {
    expect(formaterDate('2026-09-01')).toBe('1 septembre 2026');
    expect(formaterDate('n’importe quoi')).toBe('n’importe quoi');
  });
});

describe('tris', () => {
  it('place l’expérience en cours en premier, puis la plus récente', () => {
    const r = trierExperiences([
      { id: '1', startDate: '2020-01-01' },
      { id: '2', startDate: '2018-01-01', isCurrent: true },
      { id: '3', startDate: '2022-01-01' },
    ]);
    expect(r.map((e) => e.id)).toEqual(['2', '3', '1']);
  });
});

describe('validation des dates d’expérience', () => {
  const groupe = (startDate: string, endDate: string, isCurrent = false) =>
    new FormBuilder().group({ startDate, endDate, isCurrent });

  it('refuse une fin avant le début', () => {
    expect(datesCoherentes(groupe('2024-05-01', '2024-01-01'))).toEqual({ datesIncoherentes: true });
  });
  it('accepte des dates cohérentes ou un poste en cours', () => {
    expect(datesCoherentes(groupe('2024-01-01', '2024-05-01'))).toBeNull();
    expect(datesCoherentes(groupe('2024-05-01', '2024-01-01', true))).toBeNull();
    expect(datesCoherentes(groupe('2024-05-01', ''))).toBeNull();
  });
});

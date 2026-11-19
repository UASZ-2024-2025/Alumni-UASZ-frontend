import { AlumniProfile } from '../../../api/generes/alumni/model/alumniProfile';
import { Company } from '../../../api/generes/alumni/model/company';
import { StudentProfile } from '../../../api/generes/alumni/model/studentProfile';
import { LIBELLES_DISPONIBILITE } from '../../profil-etudiant/modeles/cv.modele';

export type Onglet = 'etudiants' | 'alumni' | 'entreprises';
export const ONGLETS: { code: Onglet; libelle: string }[] = [
  { code: 'etudiants', libelle: 'Étudiants' },
  { code: 'alumni', libelle: 'Alumni' },
  { code: 'entreprises', libelle: 'Entreprises' },
];

export function ongletValide(valeur: string | null): Onglet {
  return ONGLETS.some((o) => o.code === valeur) ? (valeur as Onglet) : 'etudiants';
}

export type TonBadge = 'ok' | 'info' | 'neutre';

/** Une ligne de résultat de l'annuaire, quel que soit le type (étudiant, Alumni, entreprise). */
export interface CarteAnnuaire {
  id: string;
  lien: string[];
  titre: string;
  sousTitre: string;
  details: string[];
  badge?: { texte: string; ton: TonBadge };
  etiquettes: string[];
}

export const nomComplet = (p: { firstName?: string; lastName?: string }): string =>
  `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Sans nom';

export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return '?';
  return (mots[0][0] + (mots.length > 1 ? mots[mots.length - 1][0] : '')).toUpperCase();
}

const rempli = (...valeurs: (string | undefined | false)[]): string[] =>
  valeurs.filter((v): v is string => !!v && v.trim() !== '');

export function carteEtudiant(s: StudentProfile): CarteAnnuaire {
  const dispo = s.availabilityStatus && s.availabilityStatus !== 'NOT_AVAILABLE' ? s.availabilityStatus : undefined;
  return {
    id: s.id ?? '',
    lien: ['/annuaire', 'etudiants', s.id ?? ''],
    titre: nomComplet(s),
    sousTitre: rempli(s.specialty, s.academicYear ? `Promotion ${s.academicYear}` : undefined).join(' · ') || 'Parcours non renseigné',
    details: [],
    badge: dispo ? { texte: LIBELLES_DISPONIBILITE[dispo], ton: 'ok' } : undefined,
    etiquettes: (s.skills ?? []).slice(0, 4),
  };
}

export function carteAlumni(a: AlumniProfile): CarteAnnuaire {
  const poste = rempli(a.currentPosition, a.currentCompany && `chez ${a.currentCompany}`).join(' ');
  return {
    id: a.id ?? '',
    lien: ['/annuaire', 'alumni', a.id ?? ''],
    titre: nomComplet(a),
    sousTitre: poste || 'Poste non renseigné',
    details: rempli(a.specialty, a.graduationYear ? `Promotion ${a.graduationYear}` : undefined),
    etiquettes: [],
  };
}

export function carteEntreprise(c: Company): CarteAnnuaire {
  return {
    id: c.id ?? '',
    lien: ['/annuaire', 'entreprises', c.id ?? ''],
    titre: c.name ?? 'Entreprise',
    sousTitre: c.sector ?? '',
    details: rempli(c.website, c.contactEmail),
    badge: c.isPartner ? { texte: 'Partenaire', ton: 'info' } : undefined,
    etiquettes: [],
  };
}
